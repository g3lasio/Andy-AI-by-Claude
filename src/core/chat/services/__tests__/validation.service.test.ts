import { ValidationService } from '../validation.service';
import { AppError } from '@/shared/utils/error-handler';
import { Message } from '../../interfaces/chat.types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = ValidationService.getInstance();
  });

  describe('Message Validation', () => {
    it('should validate valid messages', async () => {
      const validMessage = 'Hello, this is a valid message!';
      await expect(
        validationService.validateMessage(validMessage)
      ).resolves.not.toThrow();
    });

    it('should reject empty messages', async () => {
      const emptyMessage = '';
      await expect(
        validationService.validateMessage(emptyMessage)
      ).rejects.toThrow(AppError);
    });

    it('should reject messages exceeding length limit', async () => {
      const longMessage = 'a'.repeat(5000);
      await expect(
        validationService.validateMessage(longMessage)
      ).rejects.toThrow('Message exceeds maximum length of 4000 characters');
    });
  });

  describe('Security Validation', () => {
    it('should detect sensitive data patterns', async () => {
      const sensitiveMessages = [
        'My credit card is 4111111111111111',
        'SSN: 123-45-6789',
        'Password: mySecretPass123',
      ];

      for (const message of sensitiveMessages) {
        await expect(
          validationService.validateMessage(message)
        ).rejects.toThrow(new AppError('SENSITIVE_DATA', 500));
      }
    });

    it('should detect code injection attempts', async () => {
      const maliciousMessages = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        'onclick="malicious()"',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const message of maliciousMessages) {
        await expect(
          validationService.validateMessage(message)
        ).rejects.toThrow('Message contains potential code injection');
      }
    });
  });

  describe('Response Validation', () => {
    it('should validate proper response objects', () => {
      const validResponse: Message = {
        id: '123',
        content: 'Valid response',
        role: 'assistant',
        timestamp: Date.now(),
      };

      expect(validationService.validateResponse(validResponse)).toBe(true);
    });

    it('should reject invalid response objects', () => {
      const invalidResponses = [
        { id: '123', content: '', role: 'assistant', timestamp: Date.now() },
        { id: '123', content: 'Valid', role: 'invalid', timestamp: Date.now() },
        {
          id: '123',
          content: 'a'.repeat(5000),
          role: 'assistant',
          timestamp: Date.now(),
        },
      ];

      invalidResponses.forEach((response) => {
        expect(() =>
          validationService.validateResponse(response as Message)
        ).toThrow(AppError);
      });
    });
  });
});
