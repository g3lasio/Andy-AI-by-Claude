// src/core/documents/services/form-search.service.ts

import { FormMetadata, SearchResult } from '../interfaces/form.types';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { Anthropic } from '@anthropic-ai/sdk';

export class FormSearchService {
  private static instance: FormSearchService;
  private anthropic: Anthropic;

  private constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY as string,
    });
  }

  static getInstance(): FormSearchService {
    if (!FormSearchService.instance) {
      FormSearchService.instance = new FormSearchService();
    }
    return FormSearchService.instance;
  }

  async searchForms(query: string, context?: string): Promise<SearchResult> {
    try {
      // Usar Claude para analizar el contexto y determinar formularios necesarios
      const analysis = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: `As a tax expert, analyze this situation and list all required forms. Query: ${query}, Context: ${context}`,
          },
        ],
      });

      const forms = this.parseFormsFromAnalysis(analysis.content[0].text);

      return {
        forms,
        source: 'AI_ANALYSIS',
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error searching forms:', error);
      throw new AppError('FORM_SEARCH_ERROR', 'Error searching for forms');
    }
  }

  private parseFormsFromAnalysis(text: string): FormMetadata[] {
    // Implementar parsing de la respuesta de Claude
    return [];
  }
}
