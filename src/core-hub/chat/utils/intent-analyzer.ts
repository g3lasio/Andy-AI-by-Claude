// src/core/chat/utils/intent-analyzer.ts

import { ModuleAction } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export interface IntentAnalysis {
  module: 'TAX' | 'FINANCIAL' | 'CREDIT' | null;
  confidence: number;
  requiresAction: boolean;
  suggestedActions: ModuleAction[];
}

export class IntentAnalyzer {
  private static instance: IntentAnalyzer;

  private constructor() {}

  static getInstance(): IntentAnalyzer {
    if (!IntentAnalyzer.instance) {
      IntentAnalyzer.instance = new IntentAnalyzer();
    }
    return IntentAnalyzer.instance;
  }

  async analyzeIntent(message: string): Promise<IntentAnalysis> {
    try {
      // Palabras clave por módulo
      const taxKeywords = ['impuestos', 'tax', '1040', 'W-2', 'declaración'];
      const financialKeywords = [
        'presupuesto',
        'gastos',
        'ahorros',
        'inversión',
      ];
      const creditKeywords = ['crédito', 'score', 'disputa', 'reporte'];

      const lowercaseMessage = message.toLowerCase();

      // Determinar módulo
      let moduleType: IntentAnalysis['module'] = null;
      let confidence = 0;

      if (this.containsKeywords(lowercaseMessage, taxKeywords)) {
        moduleType = 'TAX';
        confidence = 0.8;
      } else if (this.containsKeywords(lowercaseMessage, financialKeywords)) {
        moduleType = 'FINANCIAL';
        confidence = 0.7;
      } else if (this.containsKeywords(lowercaseMessage, creditKeywords)) {
        moduleType = 'CREDIT';
        confidence = 0.7;
      }

      // Determinar si requiere acción
      const actionKeywords = [
        'realizar',
        'ejecutar',
        'hacer',
        'procesar',
        'enviar',
      ];
      const requiresAction = this.containsKeywords(
        lowercaseMessage,
        actionKeywords
      );

      return {
        module: moduleType,
        confidence,
        requiresAction,
        suggestedActions: this.getSuggestedActions(moduleType, lowercaseMessage),
      };
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return {
        module: null,
        confidence: 0,
        requiresAction: false,
        suggestedActions: [],
      };
    }
  }

  private containsKeywords(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }

  private getSuggestedActions(
    module: IntentAnalysis['module'],
    message: string
  ): ModuleAction[] {
    // Implementar lógica para sugerir acciones basadas en el módulo y mensaje
    return [];
  }
}

export const intentAnalyzer = IntentAnalyzer.getInstance();
