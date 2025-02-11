import { Message } from '../interfaces/chat.types';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';

export class ValidationService {
  private static instance: ValidationService;
  private readonly MAX_MESSAGE_LENGTH = 4000;
  private readonly MIN_MESSAGE_LENGTH = 1;
  private readonly SPAM_PATTERNS = [
    /\b(viagra|casino|lottery|prize)\b/i,
    /\b(win|winner|won)\s+\$\d+/i,
  ];
  private readonly SENSITIVE_PATTERNS = {
    creditCard: /\b\d{16}\b/,
    ssn: /\b\d{9}\b/,
    ssnFormatted: /\b\d{3}-\d{2}-\d{4}\b/,
    bankAccount: /\b\d{10,12}\b/,
    password: /\b(password|contraseña)\s*[:=]\s*\S+/i,
    email: /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/,
  };

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  async validateMessage(message: string): Promise<void> {
    try {
      this.validateMessageLength(message);
      await this.validateMessageSecurity(message);
      this.validateMessageContent(message);
    } catch (error) {
      logger.error('Message validation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageLength: message.length,
      });
      throw error;
    }
  }

  validateResponse(response: Message): boolean {
    if (
      !response ||
      !response.content ||
      typeof response.content !== 'string'
    ) {
      throw new AppError(
        'INVALID_RESPONSE',
        'Response must have valid content'
      );
    }

    if (!response.role || !['user', 'assistant'].includes(response.role)) {
      throw new AppError('INVALID_ROLE', 'Invalid message role');
    }

    if (response.content.length < this.MIN_MESSAGE_LENGTH) {
      throw new AppError('EMPTY_RESPONSE', 'Response cannot be empty');
    }

    if (response.content.length > this.MAX_MESSAGE_LENGTH) {
      throw new AppError(
        'RESPONSE_TOO_LONG',
        'Response exceeds maximum length'
      );
    }

    return true;
  }

  private validateMessageLength(message: string): void {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length < this.MIN_MESSAGE_LENGTH) {
      throw new AppError('EMPTY_MESSAGE', 'Message cannot be empty');
    }

    if (trimmedMessage.length > this.MAX_MESSAGE_LENGTH) {
      throw new AppError(
        'MESSAGE_TOO_LONG',
        `Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`
      );
    }
  }

  private validateMessageContent(message: string): void {
    // Detectar spam
    if (this.SPAM_PATTERNS.some((pattern) => pattern.test(message))) {
      throw new AppError('SPAM_DETECTED', 'Message contains spam content');
    }

    // Validar caracteres válidos
    if (!/^[\p{L}\p{N}\p{P}\p{Z}]+$/u.test(message)) {
      throw new AppError(
        'INVALID_CHARACTERS',
        'Message contains invalid characters'
      );
    }
  }

  private async validateMessageSecurity(message: string): Promise<void> {
    // Detectar información sensible
    const sensitiveInfo = this.detectSensitiveInformation(message);
    if (sensitiveInfo.length > 0) {
      throw new AppError('SENSITIVE_DATA', '500', 500);
    }

    // Validar contra inyección de código
    if (this.containsCodeInjection(message)) {
      throw new AppError(
        'CODE_INJECTION',
        'Message contains potential code injection'
      );
    }
  }

  private detectSensitiveInformation(message: string): string[] {
    const detectedPatterns: string[] = [];

    for (const [type, pattern] of Object.entries(this.SENSITIVE_PATTERNS)) {
      if (pattern.test(message)) {
        detectedPatterns.push(type);
      }
    }

    return detectedPatterns;
  }

  private containsCodeInjection(message: string): boolean {
    const codePatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=\s*["']?[^"']*["']?/gi,
      /data:\s*text\/html/gi,
      /base64/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
    ];

    return codePatterns.some((pattern) => pattern.test(message));
  }
}

export const validationService = ValidationService.getInstance();
