import { Message } from '../interfaces/chat.types';
import { firebaseApp } from '@/shared/config/firebase.config';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Anthropic } from '@anthropic-ai/sdk';

interface FinancialProfile {
  income: {
    salary: number;
    investments: number;
    otherSources: Record<string, number>;
    frequency: 'MONTHLY' | 'YEARLY';
    lastUpdated: number;
  };
  credit: {
    score: number;
    availableCredit: number;
    totalDebt: number;
    creditCards: Array<{
      provider: string;
      limit: number;
      balance: number;
    }>;
    lastUpdated: number;
  };
  budget: {
    monthlyExpenses: Record<string, number>;
    savingsGoal: number;
    emergencyFund: number;
    investmentAllocation: number;
    lastUpdated: number;
  };
  documents: {
    required: string[];
    provided: string[];
    lastUpdated: number;
  };
  riskProfile: {
    score: number;
    factors: string[];
    lastUpdated: number;
  };
}

interface FinancialMemory {
  type: 'EXPENSE' | 'INCOME' | 'HABIT' | 'GOAL' | 'CONTEXT';
  category?: string;
  amount?: number;
  frequency?: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  timestamp: number;
  description: string;
  confidence: number;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class MemoryService {
  private static instance: MemoryService;
  private db = getFirestore(firebaseApp);
  private anthropic: Anthropic;
  private readonly PROFILE_FRESHNESS_DAYS = 30;

  private constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY as string
    });
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  async getFinancialProfile(userId: string): Promise<FinancialProfile | null> {
    try {
      const profileRef = doc(this.db, `users/${userId}/profile/financial`);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        return null;
      }

      const profile = profileDoc.data() as FinancialProfile;
      const needsUpdate = this.checkProfileFreshness(profile);

      if (needsUpdate) {
        await this.requestProfileUpdate(userId, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error retrieving financial profile:', error);
      throw new AppError('PROFILE_RETRIEVAL_ERROR', 'Failed to retrieve financial profile');
    }
  }

  private checkProfileFreshness(profile: FinancialProfile): boolean {
    const now = Date.now();
    const staleThreshold = this.PROFILE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

    return (
      now - profile.income.lastUpdated > staleThreshold ||
      now - profile.credit.lastUpdated > staleThreshold ||
      now - profile.budget.lastUpdated > staleThreshold
    );
  }

  async requestProfileUpdate(userId: string, currentProfile: FinancialProfile): Promise<void> {
    const missingDocs = this.identifyMissingDocuments(currentProfile);
    if (missingDocs.length > 0) {
      await this.createDocumentRequest(userId, missingDocs);
    }

    const integrations = this.identifyNeededIntegrations(currentProfile);
    if (integrations.length > 0) {
      await this.requestIntegrations(userId, integrations);
    }
  }

  private identifyMissingDocuments(profile: FinancialProfile): string[] {
    const requiredDocs = new Set([
      'BANK_STATEMENTS',
      'TAX_RETURNS',
      'CREDIT_REPORTS',
      'INVESTMENT_STATEMENTS'
    ]);

    const providedDocs = new Set(profile.documents.provided);
    return Array.from(requiredDocs).filter(doc => !providedDocs.has(doc));
  }

  private async createDocumentRequest(userId: string, documents: string[]): Promise<void> {
    const requestRef = doc(this.db, `users/${userId}/requests/documents`);
    await setDoc(requestRef, {
      documents,
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: Date.now()
    });
  }

  async updateFinancialContext(
    userId: string,
    context: string,
    type: 'TRANSACTION' | 'GOAL' | 'STATUS_UPDATE'
  ): Promise<void> {
    const profile = await this.getFinancialProfile(userId);
    const analysis = await this.analyzeFinancialContext(context, profile);

    await this.storeMemory(userId, analysis.description, analysis.importance, analysis.type);

    if (analysis.requiresAction) {
      await this.createActionItems(userId, analysis.actions);
    }
  }

  private async analyzeFinancialContext(context: string, profile: FinancialProfile | null): Promise<any> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze this financial context with the following user profile: ${JSON.stringify(profile)}\n\nContext: ${context}`
      }]
    });

    return JSON.parse(response.content[0].text);
  }

  async identifyFinancialHabits(userId: string): Promise<void> {
    try {
      const profile = await this.getFinancialProfile(userId);
      const expenses = await this.retrieveRelevantMemories(userId, 'expenses', 50);
      const habits = this.analyzeSpendingPatterns(expenses, profile);

      await this.storeMemory(userId, JSON.stringify(habits), 2, 'HABIT');

      if (habits.riskFactors.length > 0) {
        await this.createRiskAlert(userId, habits.riskFactors);
      }
    } catch (error) {
      logger.error('Error identifying financial habits:', error);
      throw new AppError('HABIT_ANALYSIS_ERROR', 'Failed to analyze financial habits');
    }
  }

  private async createRiskAlert(userId: string, factors: string[]): Promise<void> {
    const alertRef = doc(this.db, `users/${userId}/alerts/risk_${Date.now()}`);
    await setDoc(alertRef, {
      type: 'RISK_ALERT',
      factors,
      status: 'NEW',
      createdAt: Date.now()
    });
  }

  private identifyNeededIntegrations(profile: FinancialProfile): string[] {
    return []; // Placeholder - needs implementation based on profile data
  }

  private async requestIntegrations(userId: string, integrations: string[]): Promise<void> {
    // Placeholder - needs implementation to request integrations
  }

  private async createActionItems(userId: string, actions: any[]): Promise<void> {
    // Placeholder - needs implementation to create action items
  }


  async storeMemory(
    userId: string,
    context: string,
    importance: number = 1,
    type: FinancialMemory['type'] = 'CONTEXT'
  ): Promise<void> {
    try {
      const analysis = await this.analyzeFinancialContext(context, await this.getFinancialProfile(userId));
      const memoryRef = doc(this.db, `users/${userId}/memories/${Date.now()}`);
      
      await setDoc(memoryRef, {
        ...analysis,
        type,
        importance,
        timestamp: Date.now(),
        lastAccessed: Date.now()
      });
    } catch (error) {
      logger.error('Error storing memory:', error);
      throw new AppError('MEMORY_STORAGE_ERROR', 'Failed to store memory');
    }
  }

  async retrieveRelevantMemories(
    userId: string,
    context: string,
    limit: number = 5
  ): Promise<FinancialMemory[]> {
    try {
      const keywords = await this.extractFinancialKeywords(context);
      const memoriesRef = collection(this.db, `users/${userId}/memories`);
      const recentMemories = query(
        memoriesRef,
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(recentMemories);
      const memories = snapshot.docs.map(doc => doc.data() as FinancialMemory);
      
      return this.rankMemoriesByRelevance(memories, keywords).slice(0, limit);
    } catch (error) {
      logger.error('Error retrieving memories:', error);
      throw new AppError('MEMORY_RETRIEVAL_ERROR', 'Failed to retrieve memories');
    }
  }

  async summarizeFinancialStatus(userId: string): Promise<string> {
    try {
      const memoriesRef = collection(this.db, `users/${userId}/memories`);
      const recentMemories = query(
        memoriesRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(recentMemories);
      const memories = snapshot.docs.map(doc => doc.data() as FinancialMemory);

      return await this.generateFinancialSummary(memories);
    } catch (error) {
      logger.error('Error summarizing financial status:', error);
      throw new AppError('MEMORY_SUMMARY_ERROR', 'Failed to summarize financial status');
    }
  }

  private async analyzeFinancialContext(context: string, profile: FinancialProfile | null): Promise<Partial<FinancialMemory>> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze this financial context and extract key information: ${context}  User Profile: ${JSON.stringify(profile)}`
      }]
    });

    const analysis = JSON.parse(response.content[0].text);
    return {
      description: context,
      ...analysis
    };
  }

  private async extractFinancialKeywords(context: string): Promise<string[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Extract key financial terms and concepts from: ${context}`
      }]
    });

    return response.content[0].text.split(',').map(k => k.trim());
  }

  private rankMemoriesByRelevance(memories: FinancialMemory[], keywords: string[]): FinancialMemory[] {
    return memories.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, keywords);
      const scoreB = this.calculateRelevanceScore(b, keywords);
      return scoreB - scoreA;
    });
  }

  private calculateRelevanceScore(memory: FinancialMemory, keywords: string[]): number {
    const recencyScore = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24); // Days old
    const keywordScore = keywords.reduce((score, keyword) => {
      return score + (memory.description.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    
    return (keywordScore * 0.7) + (1 / (recencyScore + 1) * 0.3);
  }

  private async generateFinancialSummary(memories: FinancialMemory[]): Promise<string> {
    const context = memories.map(m => `${m.type}: ${m.description}`).join('\n');
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Generate a friendly and slightly sarcastic summary of this financial history. Focus on patterns and habits: ${context}`
      }]
    });

    return response.content[0].text;
  }

  private analyzeSpendingPatterns(memories: FinancialMemory[], profile: FinancialProfile | null): any {
    const patterns = memories.reduce((acc, memory) => {
      if (memory.category) {
        acc[memory.category] = (acc[memory.category] || 0) + memory.amount || 0;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalSpending = Object.values(patterns).reduce((sum, val) => sum + val, 0);
    const riskFactors: string[] = [];

    if (profile) {
        const disposableIncome = profile.income.salary - Object.values(profile.budget.monthlyExpenses).reduce((a, b) => a + b, 0)
        if (totalSpending > disposableIncome * 0.8) {
            riskFactors.push('High spending relative to income');
        }

        //add more risk factors based on profile data
    }

    return {
      spendingPatterns: Object.entries(patterns)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / totalSpending) * 100
        })),
      riskFactors
    };
  }
}

export const memoryService = MemoryService.getInstance();