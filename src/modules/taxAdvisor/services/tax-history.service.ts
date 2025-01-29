
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { retry } from '@/shared/utils/retry';
import { Cache } from '@/shared/utils/cache';
import { firebaseApp } from '@/shared/config/firebase.config';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, orderBy, limit, Timestamp } from 'firebase/firestore';

interface TaxAnalysisResult {
  errors: Array<{
    type: 'CALCULATION' | 'DOCUMENTATION' | 'REPORTING';
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    yearAffected: number;
    potentialImpact: number;
  }>;
  unclaimedCredits: Array<{
    creditType: string;
    yearApplicable: number;
    estimatedAmount: number;
    eligibilityConfidence: number;
    requirements: string[];
  }>;
  documentationIssues: Array<{
    documentType: string;
    yearAffected: number;
    issue: string;
    recommendation: string;
  }>;
  improvements: Array<{
    category: string;
    description: string;
    potentialBenefit: number;
    implementationSteps: string[];
  }>;
}

interface TaxHistory {
  userId: string;
  years: {
    [year: string]: {
      income: {
        wages: number;
        selfEmployment?: number;
        investments?: number;
        other?: number;
      };
      deductions: {
        type: string;
        amount: number;
        category: string;
        documentation: string[];
      }[];
      credits: {
        type: string;
        amount: number;
        eligibility: boolean;
        documentation: string[];
      }[];
      filingStatus: string;
      totalTax: number;
      refundAmount?: number;
      documents: {
        type: string;
        id: string;
        submissionDate: Date;
        verified: boolean;
      }[];
      amendments?: {
        date: Date;
        reason: string;
        changes: Record<string, any>;
      }[];
    };
  };
  lastUpdated: Date;
  analysis?: TaxAnalysisResult;
}

export class TaxHistoryService {
  private anthropic: Anthropic;
  private db = getFirestore(firebaseApp);
  private cache: Cache<string, any>;
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.cache = new Cache({ maxSize: 1000, ttl: 3600000 });
  }

  async analyzeHistoricalReturns(userId: string): Promise<TaxAnalysisResult> {
    try {
      const history = await this.maintainTaxHistory(userId);
      const years = Object.keys(history.years).sort();
      
      if (years.length === 0) {
        throw new AppError('NO_HISTORY', 'No tax history available for analysis');
      }

      // Analizar errores de cálculo
      const calculationErrors = await this.detectCalculationErrors(history);
      
      // Buscar créditos no reclamados
      const unclaimedCredits = await this.findUnclaimedCredits(history);
      
      // Verificar problemas de documentación
      const documentationIssues = await this.checkDocumentationIssues(history);
      
      // Identificar oportunidades de mejora
      const improvements = await this.identifyImprovements(history);

      const analysis: TaxAnalysisResult = {
        errors: calculationErrors,
        unclaimedCredits,
        documentationIssues,
        improvements
      };

      // Actualizar el historial con el nuevo análisis
      await this.updateHistoryAnalysis(userId, analysis);

      return analysis;
    } catch (error) {
      logger.error('Error analyzing tax history:', error);
      throw new AppError('ANALYSIS_ERROR', 'Failed to analyze tax history');
    }
  }

  private async detectCalculationErrors(history: TaxHistory): Promise<any[]> {
    const errors = [];
    
    for (const [year, yearData] of Object.entries(history.years)) {
      // Verificar cálculos de ingresos totales
      const reportedTotal = this.calculateTotalIncome(yearData.income);
      const documentedTotal = this.sumDocumentedIncome(yearData.documents);
      
      if (Math.abs(reportedTotal - documentedTotal) > 0.01) {
        errors.push({
          type: 'CALCULATION',
          description: `Income total mismatch in ${year}`,
          severity: 'HIGH',
          yearAffected: parseInt(year),
          potentialImpact: Math.abs(reportedTotal - documentedTotal)
        });
      }

      // Verificar límites de deducciones
      for (const deduction of yearData.deductions) {
        const deductionLimit = await this.getDeductionLimit(deduction.type, year);
        if (deduction.amount > deductionLimit) {
          errors.push({
            type: 'CALCULATION',
            description: `Deduction exceeds limit for ${deduction.type}`,
            severity: 'MEDIUM',
            yearAffected: parseInt(year),
            potentialImpact: deduction.amount - deductionLimit
          });
        }
      }
    }

    return errors;
  }

  private async findUnclaimedCredits(history: TaxHistory): Promise<any[]> {
    const unclaimedCredits = [];
    
    for (const [year, yearData] of Object.entries(history.years)) {
      // Analizar elegibilidad para créditos comunes
      const eligibleCredits = await this.analyzeEligibleCredits(yearData);
      
      // Comparar con créditos reclamados
      const claimedCreditTypes = yearData.credits.map(c => c.type);
      
      for (const credit of eligibleCredits) {
        if (!claimedCreditTypes.includes(credit.type)) {
          unclaimedCredits.push({
            creditType: credit.type,
            yearApplicable: parseInt(year),
            estimatedAmount: credit.estimatedAmount,
            eligibilityConfidence: credit.confidence,
            requirements: credit.requirements
          });
        }
      }
    }

    return unclaimedCredits;
  }

  private async checkDocumentationIssues(history: TaxHistory): Promise<any[]> {
    const issues = [];

    for (const [year, yearData] of Object.entries(history.years)) {
      // Verificar documentos faltantes
      const requiredDocs = await this.getRequiredDocuments(yearData);
      const submittedDocs = yearData.documents.map(d => d.type);
      
      for (const doc of requiredDocs) {
        if (!submittedDocs.includes(doc.type)) {
          issues.push({
            documentType: doc.type,
            yearAffected: parseInt(year),
            issue: 'Missing required document',
            recommendation: doc.recommendation
          });
        }
      }

      // Verificar documentos no verificados
      const unverifiedDocs = yearData.documents.filter(d => !d.verified);
      for (const doc of unverifiedDocs) {
        issues.push({
          documentType: doc.type,
          yearAffected: parseInt(year),
          issue: 'Document not verified',
          recommendation: 'Submit for verification'
        });
      }
    }

    return issues;
  }

  private async identifyImprovements(history: TaxHistory): Promise<any[]> {
    const improvements = [];
    
    // Analizar patrones históricos
    const patterns = await this.analyzeHistoricalPatterns(history);
    
    // Identificar oportunidades de optimización
    for (const pattern of patterns) {
      if (pattern.type === 'DEDUCTION_OPPORTUNITY') {
        improvements.push({
          category: 'Deductions',
          description: pattern.description,
          potentialBenefit: pattern.estimatedBenefit,
          implementationSteps: pattern.steps
        });
      } else if (pattern.type === 'CREDIT_OPPORTUNITY') {
        improvements.push({
          category: 'Credits',
          description: pattern.description,
          potentialBenefit: pattern.estimatedBenefit,
          implementationSteps: pattern.steps
        });
      }
    }

    return improvements;
  }

  private calculateTotalIncome(income: any): number {
    return (
      income.wages +
      (income.selfEmployment || 0) +
      (income.investments || 0) +
      (income.other || 0)
    );
  }

  private sumDocumentedIncome(documents: any[]): number {
    return documents
      .filter(doc => doc.type.includes('INCOME'))
      .reduce((sum, doc) => sum + (doc.amount || 0), 0);
  }

  private async getDeductionLimit(type: string, year: string): Promise<number> {
    // Implementar lógica de límites de deducciones
    return 0;
  }

  private async analyzeEligibleCredits(yearData: any): Promise<any[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze tax data for eligible credits:
          Income: ${JSON.stringify(yearData.income)}
          Filing Status: ${yearData.filingStatus}
          Documents: ${JSON.stringify(yearData.documents)}`
      }]
    });

    return JSON.parse(response.content[0].text);
  }

  private async getRequiredDocuments(yearData: any): Promise<any[]> {
    // Implementar lógica de documentos requeridos
    return [];
  }

  private async analyzeHistoricalPatterns(history: TaxHistory): Promise<any[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze historical tax patterns and identify opportunities:
          ${JSON.stringify(history)}`
      }]
    });

    return JSON.parse(response.content[0].text);
  }

  private async updateHistoryAnalysis(
    userId: string,
    analysis: TaxAnalysisResult
  ): Promise<void> {
    const historyRef = doc(this.db, 'taxHistory', userId);
    await updateDoc(historyRef, {
      analysis,
      lastUpdated: Timestamp.now()
    });
  }
}
