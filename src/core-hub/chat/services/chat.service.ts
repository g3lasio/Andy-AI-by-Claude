import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { Message, ChatResponse, AIModel } from '../interfaces/chat.types';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { RateLimiter } from '@/shared/utils/rate-limiter';
import { Cache } from '@/shared/utils/cache';
import { retry } from '@/shared/utils/retry';
import { Timeout } from '@/shared/utils/timeout';

export class ChatService {
  private static instance: ChatService;
  private anthropic: Anthropic;
  private openai: OpenAI;
  private rateLimiter: RateLimiter;
  private cache: Cache<string, ChatResponse>;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000;

  private currentContext: Map<
    string,
    {
      lastMessage: string;
      lastResponse: ChatResponse;
      timestamp: number;
      conversationHistory: Message[];
    }
  > = new Map();

  private constructor() {
    this.initializeServices();
    this.rateLimiter = new RateLimiter({ maxRequests: 50, perMinute: 1 });
    this.cache = new Cache({ maxSize: 1000, ttl: 3600000 });
  }

  private async initializeServices(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
        throw new Error('Missing required API keys');
      }

      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Validate connections with a simple test request
      await Promise.all([
        this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        }),
        this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      ]);

      logger.info('AI services initialized and validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to initialize AI services:', errorMessage);
      throw new AppError('SERVICE_INIT_ERROR', `Failed to initialize AI services: ${errorMessage}`);
    }
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  async processMessage(
    userId: string,
    message: string,
    attachments?: Array<{
      type: string;
      content: Buffer | string;
      name: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<ChatResponse> {
    await this.rateLimiter.checkLimit(userId);

    const cacheKey = this.generateCacheKey(userId, message);
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const context = await this.getContext(userId);
      const modelType = await this.determineAIModel(message, context);

      let attachmentContext = '';
      if (attachments?.length) {
        attachmentContext = await this.processAttachments(attachments);
      }

      const response = await Timeout.wrap(
        this.getAIResponseWithRetry(
          message,
          attachmentContext,
          context,
          modelType
        ),
        this.TIMEOUT_MS
      );

      await this.updateContext(userId, message, response);
      this.cache.set(cacheKey, response);

      return response;
    } catch (error) {
      logger.error('Error processing message:', {
        userId,
        messagePreview: message.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError(
        'CHAT_ERROR',
        'Failed to process message: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  private async getAIResponseWithRetry(
    message: string,
    attachmentContext: string,
    context: unknown,
    model: AIModel
  ): Promise<ChatResponse> {
    return retry(
      () => this.getAIResponse(message, attachmentContext, context, model),
      this.MAX_RETRIES
    );
  }

  private generateCacheKey(userId: string, message: string): string {
    return `${userId}:${message}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      if (error.message.includes('rate limit')) {
        return 'Too many requests. Please wait a moment.';
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  private async determineAIModel(
    message: string,
    context: unknown
  ): Promise<AIModel> {
    const technicalScore = this.calculateTechnicalScore(message);
    const contextComplexity = this.evaluateContextComplexity(context);

    if (technicalScore > 0.7 || contextComplexity > 0.8) {
      return 'claude';
    }
    return 'gpt4';
  }

  private calculateTechnicalScore(message: string): number {
    const technicalKeywords = [
      'tax',
      'impuestos',
      'w2',
      '1099',
      'deduction',
      'credit',
      'calculation',
      'analysis',
      'report',
      'form',
    ];

    const wordCount = message.split(' ').length;
    const technicalWordCount = technicalKeywords.filter((keyword) =>
      message.toLowerCase().includes(keyword)
    ).length;

    return technicalWordCount / wordCount;
  }

  private evaluateContextComplexity(context: unknown): number {
    const contextString = JSON.stringify(context);
    const complexity = contextString.length / 1000; // Normalize by 1000 chars
    return Math.min(complexity, 1);
  }

  private async getAIResponse(
    message: string,
    attachmentContext: string,
    context: unknown,
    model: AIModel
  ): Promise<ChatResponse> {
    const prompt = this.buildPrompt(message, attachmentContext, context);

    if (model === 'claude') {
      return await this.getClaudeResponse(prompt);
    } else {
      return await this.getGPT4Response(prompt);
    }
  }

  private async getClaudeResponse(prompt: string): Promise<ChatResponse> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system:
        'You are Andy AI, a sophisticated financial assistant specializing in tax preparation, financial analysis, and document processing. Focus on providing accurate, actionable financial advice. When analyzing documents, highlight key financial implications and potential tax considerations. Maintain conversation history for context-aware responses.',
    });

    return {
      content: response.content[0].text,
      source: 'claude',
      actions: this.extractActions(response.content[0].text),
      confidence: response.content[0].role === 'assistant' ? 0.9 : 0.7,
    };
  }

  private async getGPT4Response(prompt: string): Promise<ChatResponse> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are Andy AI, a sophisticated financial assistant specializing in tax preparation, financial analysis, and document processing. Prioritize accuracy in financial calculations and tax-related advice. Provide step-by-step explanations when analyzing complex financial scenarios.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'text' },
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    return {
      content: response.choices[0].message.content || '',
      source: 'gpt4',
      actions: this.extractActions(response.choices[0].message.content || ''),
    };
  }

  private async processAttachments(
    attachments: Array<{
      type: string;
      content: Buffer | string;
      name: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<string> {
    const processedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        return await this.processAttachment(attachment);
      })
    );

    return processedAttachments.join('\n\n');
  }

  private async processAttachment(attachment: {
    type: string;
    content: Buffer | string;
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    switch (attachment.type) {
      case 'pdf':
        return await this.processPDF(attachment);
      case 'image':
        return await this.processImage(attachment);
      default:
        return await this.processGenericFile(attachment);
    }
  }

  private buildPrompt(
    message: string,
    attachmentContext: string,
    context: any
  ): string {
    const conversationHistory = context.conversationHistory || [];
    const lastInteractions = conversationHistory.slice(-3); // Mantener últimas 3 interacciones

    return `
Previous Context: ${lastInteractions.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}
${attachmentContext ? `Document Analysis:\n${attachmentContext}\n` : ''}
Current Request: ${message}

Focus on providing specific, actionable financial guidance based on the complete context. If analyzing documents, highlight key financial implications and tax considerations.
    `.trim();
  }

  private extractActions(response: string): Array<{
    type: string;
    payload: unknown;
  }> {
    const actions = [];
    const actionPatterns = [
      { regex: /\[ACTION:FORM_REQUEST:(.*?)\]/g, type: 'FORM_REQUEST' },
      { regex: /\[ACTION:CALCULATION:(.*?)\]/g, type: 'CALCULATION' },
      { regex: /\[ACTION:VERIFICATION:(.*?)\]/g, type: 'VERIFICATION' }
    ];

    for (const pattern of actionPatterns) {
      const matches = [...response.matchAll(pattern.regex)];
      for (const match of matches) {
        actions.push({
          type: pattern.type,
          payload: match[1].trim()
        });
      }
    }

    return actions;
  }

  private async getContext(userId: string): Promise<any> {
    return this.currentContext.get(userId) || {};
  }

  private async updateContext(
    userId: string,
    message: string,
    response: ChatResponse
  ): Promise<void> {
    try {
      if (!userId || !message) {
        throw new AppError(
          'INVALID_CONTEXT_UPDATE',
          'User ID and message are required'
        );
      }

      const currentContext = this.currentContext.get(userId) || {};
      const timestamp = Date.now();
      const maxHistoryLength = 50; // Limitar el historial para evitar problemas de memoria

      const newHistory = [
        ...(currentContext.conversationHistory || []).slice(-maxHistoryLength),
        {
          role: 'user',
          content: message,
          timestamp,
        },
        {
          role: 'assistant',
          content: response.content,
          timestamp,
          metadata: {
            confidence: response.confidence,
            source: response.source,
            processingTime: Date.now() - timestamp,
          },
        },
      ];

      const contextUpdate = {
        ...currentContext,
        lastMessage: message,
        lastResponse: response,
        timestamp,
        conversationHistory: newHistory,
        metrics: {
          ...currentContext.metrics,
          totalInteractions:
            (currentContext.metrics?.totalInteractions || 0) + 1,
          lastUpdateTime: timestamp,
        },
      };

      this.currentContext.set(userId, contextUpdate);

      // Persistir el contexto en caso de reinicio
      await this.persistContext(userId, contextUpdate);
    } catch (error) {
      logger.error('Error updating context:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError(
        'CONTEXT_UPDATE_ERROR',
        'Failed to update conversation context'
      );
    }
  }

  private async persistContext(userId: string, context: any): Promise<void> {
    try {
      const db = getFirestore(firebaseApp);
      const contextRef = doc(db, `users/${userId}/context/current`);
      await setDoc(contextRef, {
        ...context,
        lastUpdated: Timestamp.now(),
      });
    } catch (error) {
      logger.warn('Failed to persist context:', error);
      // No lanzar error para no interrumpir la conversación
    }
  }

  private requiresTechnicalAnalysis(message: string): boolean {
    const technicalKeywords = [
      'tax',
      'impuestos',
      'w2',
      '1099',
      'deduction',
      'credit',
      'calculation',
      'analysis',
      'report',
      'form',
    ];

    return technicalKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  private async processPDF(attachment: {
    type: string;
    content: Buffer | string;
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    // Implement PDF processing logic here
    return 'PDF content processing not implemented';
  }

  private async processImage(attachment: {
    type: string;
    content: Buffer | string;
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    // Implement image processing logic here
    return 'Image content processing not implemented';
  }

  private async processGenericFile(attachment: {
    type: string;
    content: Buffer | string;
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    // Implement generic file processing logic here
    return 'Generic file content processing not implemented';
  }
}

export const chatService = ChatService.getInstance();