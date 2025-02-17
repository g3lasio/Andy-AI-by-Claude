
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { TaxYear, DocumentationType, IRSRequirement } from '../interfaces/tax-documentation.types';

export class TaxDocumentationService {
  private anthropic: Anthropic;
  private readonly REQUIRED_DOCS_BY_TYPE = new Map<string, IRSRequirement[]>();

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.initializeRequirements();
  }

  private initializeRequirements() {
    // Actualizado para 2024
    this.REQUIRED_DOCS_BY_TYPE.set('EMPLOYMENT', [
      { formId: 'W-2', description: 'Wage and Tax Statement', deadline: '01/31/2024' },
      { formId: '1099-NEC', description: 'Nonemployee Compensation', deadline: '01/31/2024' },
    ]);
    
    this.REQUIRED_DOCS_BY_TYPE.set('INVESTMENTS', [
      { formId: '1099-B', description: 'Proceeds from Broker Transactions', deadline: '02/15/2024' },
      { formId: '1099-DIV', description: 'Dividends and Distributions', deadline: '02/15/2024' },
      { formId: '1099-INT', description: 'Interest Income', deadline: '02/15/2024' },
    ]);

  private validateDocument(doc: any): boolean {
    const validations = {
      'W-2': (d) => {
        return d.employerEIN && 
               d.employeeSsn && 
               d.wagesAmount && 
               d.taxYear && 
               d.employerInfo;
      },
      '1099-NEC': (d) => {
        return d.payerTIN && 
               d.recipientTIN && 
               d.nonEmployeeCompensation && 
               d.taxYear;
      },
      '1099-B': (d) => {
        return d.brokerTIN && 
               d.recipientTIN && 
               d.proceeds && 
               d.costBasis && 
               d.taxYear;
      }
    };

    return validations[doc.formType] ? 
           validations[doc.formType](doc.content) : 
           false;
  }

  }

  async generateSupportingDocuments(taxData: any): Promise<{
    documents: Document[];
    explanations: Map<string, string>;
    warnings: string[];
  }> {
    try {
      const documents = [];
      const explanations = new Map<string, string>();
      const warnings = [];

      // Analizar datos con IA para identificar documentos necesarios
      const aiAnalysis = await this.analyzeWithAI(taxData);
      
      // Generar cartas explicativas
      for (const [formId, explanation] of aiAnalysis.explanations) {
        const letter = await this.generateExplanatoryLetter(formId, explanation);
        documents.push(letter);
        explanations.set(formId, explanation);
      }

      // Verificar documentación faltante
      const missingDocs = await this.checkMissingDocumentation(taxData);
      warnings.push(...missingDocs.map(doc => `Missing required document: ${doc.formId}`));

      return {
        documents,
        explanations,
        warnings
      };
    } catch (error) {
      logger.error('Error generating supporting documents:', error);
      throw new AppError('DOCUMENTATION_ERROR', 'Failed to generate supporting documentation');
    }
  }

  async createYearEndSummary(userId: string): Promise<{
    summary: string;
    recommendations: string[];
    nextYearPrep: string[];
  }> {
    try {
      // Obtener historial fiscal
      const taxHistory = await this.getTaxHistory(userId);
      
      // Analizar cambios significativos
      const changes = await this.analyzeYearOverYearChanges(taxHistory);
      
      // Generar recomendaciones personalizadas
      const recommendations = await this.generateRecommendations(changes);

      return {
        summary: this.formatYearEndSummary(changes),
        recommendations,
        nextYearPrep: this.generatePreparationChecklist(recommendations)
      };
    } catch (error) {
      logger.error('Error creating year-end summary:', error);
      throw new AppError('SUMMARY_ERROR', 'Failed to create year-end summary');
    }
  }

  private async analyzeWithAI(taxData: any) {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze this tax data comprehensively:
        1. Identify all required documentation
        2. Check for missing information
        3. Validate data consistency
        4. Find potential deductions
        5. Verify compliance with latest IRS regulations
        6. Identify audit risk factors
        
        Data: ${JSON.stringify(taxData)}`
      }]
    });

    const analysis = this.parseAIResponse(response.content[0].text);
    
    // Verificación adicional de documentos
    const requiredDocs = await this.validateRequiredDocuments(analysis.requiredDocs);
    
    // Análisis de riesgo
    const riskAnalysis = await this.performRiskAnalysis(analysis.data);
    
    // Verificación de regulaciones actualizadas
    const complianceCheck = await this.verifyIRSCompliance(analysis.data);

    return {
      ...analysis,
      requiredDocs,
      riskAnalysis,
      complianceCheck,
      recommendations: await this.generateRecommendations(analysis)
    };
  }

  private async validateRequiredDocuments(docs: string[]): Promise<{
    valid: boolean;
    missing: string[];
    suggestions: string[];
  }> {
    const validation = {
      valid: true,
      missing: [] as string[],
      suggestions: [] as string[]
    };

    for (const doc of docs) {
      const isValid = await this.checkDocumentRequirements(doc);
      if (!isValid) {
        validation.valid = false;
        validation.missing.push(doc);
        validation.suggestions.push(await this.getSuggestionForDocument(doc));
      }
    }

    return validation;
  }

  private async performRiskAnalysis(data: any): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
    recommendations: string[];
  }> {
    const riskFactors = await this.identifyRiskFactors(data);
    return {
      riskLevel: this.calculateRiskLevel(riskFactors),
      factors: riskFactors,
      recommendations: await this.generateRiskRecommendations(riskFactors)
    };
  }

  private async checkMissingDocumentation(taxData: any): Promise<IRSRequirement[]> {
    const missingDocs = [];
    for (const [type, requirements] of this.REQUIRED_DOCS_BY_TYPE) {
      if (this.hasIncomeType(taxData, type)) {
        for (const req of requirements) {
          if (!this.hasDocument(taxData, req.formId)) {
            missingDocs.push(req);
          }
        }
      }
    }
    return missingDocs;
  }

  private hasIncomeType(taxData: any, type: string): boolean {
    if (!taxData?.income) return false;
    
    const incomeTypes = {
      'EMPLOYMENT': (data) => data.w2Income > 0 || data.contractIncome > 0,
      'INVESTMENTS': (data) => data.dividends > 0 || data.capitalGains > 0 || data.interest > 0,
      'BUSINESS': (data) => data.businessIncome > 0 || data.selfEmploymentIncome > 0,
      'RENTAL': (data) => data.rentalIncome > 0,
      'RETIREMENT': (data) => data.pensionIncome > 0 || data.iraDistributions > 0
    };

    return incomeTypes[type] ? incomeTypes[type](taxData.income) : false;
  }

  private hasDocument(taxData: any, formId: string): boolean {
    if (!taxData?.documents || !Array.isArray(taxData.documents)) {
      return false;
    }

    return taxData.documents.some(doc => {
      if (!doc.formId || !doc.status) return false;
      return doc.formId === formId && doc.status === 'VERIFIED';
    });
  };
  }
}
