
import { Logger } from '../../../shared/utils/logger';
import { Anthropic } from '@anthropic-ai/sdk';

export class DocumentMonitoringService {
  private static instance: DocumentMonitoringService;
  private anthropic: Anthropic;
  private logger: Logger;

  private constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.logger = Logger.getInstance();
  }

  public static getInstance(): DocumentMonitoringService {
    if (!this.instance) {
      this.instance = new DocumentMonitoringService();
    }
    return this.instance;
  }

  public async logProcessingEvent(documentId: string, action: string, result: any) {
    this.logger.info('Document Processing Event', {
      documentId,
      action,
      result,
      timestamp: new Date()
    });
  }

  public async analyzeSensitiveContent(content: string): Promise<{
    hasSensitiveData: boolean;
    details: string[];
  }> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analiza este documento en busca de información sensible como:
        - Datos personales
        - Información financiera
        - Datos médicos
        - Información confidencial
        
        Documento: ${content}`
      }]
    });

    return {
      hasSensitiveData: response.content[0].text.toLowerCase().includes('sensible'),
      details: response.content[0].text.split('\n')
    };
  }
}
