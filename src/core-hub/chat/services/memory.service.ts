
import { Message } from '../interfaces/chat.types';
import { firebaseApp } from '@/shared/config/firebase.config';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Anthropic } from '@anthropic-ai/sdk';

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

  async storeMemory(
    userId: string,
    context: string,
    importance: number = 1,
    type: FinancialMemory['type'] = 'CONTEXT'
  ): Promise<void> {
    try {
      const analysis = await this.analyzeFinancialContext(context);
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

  private async analyzeFinancialContext(context: string): Promise<Partial<FinancialMemory>> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Analyze this financial context and extract key information: ${context}`
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

  async identifyFinancialHabits(userId: string): Promise<void> {
    try {
      const expenses = await this.retrieveRelevantMemories(userId, 'expenses', 50);
      const habits = this.analyzeSpendingPatterns(expenses);
      await this.storeMemory(userId, JSON.stringify(habits), 2, 'HABIT');
    } catch (error) {
      logger.error('Error identifying financial habits:', error);
      throw new AppError('HABIT_ANALYSIS_ERROR', 'Failed to analyze financial habits');
    }
  }

  private analyzeSpendingPatterns(memories: FinancialMemory[]): any {
    const patterns = memories.reduce((acc, memory) => {
      if (memory.category) {
        acc[memory.category] = (acc[memory.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(patterns)
      .map(([category, count]) => ({
        category,
        frequency: count,
        isRecurrent: count > 3
      }));
  }
}

export const memoryService = MemoryService.getInstance();
