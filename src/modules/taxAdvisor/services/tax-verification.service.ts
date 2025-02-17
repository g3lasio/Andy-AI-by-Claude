
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
  }>;
  recommendations: string[];
}

interface AuditRiskResult {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  flags: string[];
  recommendations: string[];
}

export class TaxVerificationService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async validateCalculations(formData: any): Promise<ValidationResult> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [{
          role: 'user',
          content: `Validate these tax calculations and identify any errors:
            ${JSON.stringify(formData)}`
        }]
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      logger.error('Error validating calculations:', error);
      throw new AppError('VALIDATION_ERROR', 'Failed to validate calculations');
    }
  }

  async checkForAuditorTriggers(taxReturn: any): Promise<AuditRiskResult> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        messages: [{
          role: 'user',
          content: `Analyze this tax return for potential audit triggers:
            ${JSON.stringify(taxReturn)}`
        }]
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      logger.error('Error checking audit triggers:', error);
      throw new AppError('AUDIT_CHECK_ERROR', 'Failed to check audit triggers');
    }
  }
}
