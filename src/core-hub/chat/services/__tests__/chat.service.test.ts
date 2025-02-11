
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ChatService } from '../chat.service';
import { ValidationService } from '../validation.service';
import { ContextService } from '../context.service';
import { Message, ChatResponse } from '../../interfaces/chat.types';

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'Mocked Anthropic response', role: 'assistant' }],
      }),
    },
  })),
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mocked OpenAI response',
              role: 'assistant'
            }
          }]
        }),
      },
    },
  })),
}));

vi.mock('@/shared/utils/cache', () => ({
  default: {
    Cache: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    }
  }
}));
vi.mock('../validation.service');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockMessage: string;
  let mockUserId: string;
  let mockAttachment: {
    type: string;
    content: string;
    name: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mockCache = vi.mocked(Cache);
    mockCache.mockClear();
    chatService = ChatService.getInstance();
    mockMessage = 'Test message';
    mockUserId = 'test-user-123';
    mockAttachment = {
      type: 'pdf',
      content: 'test content',
      name: 'test.pdf',
    };
  });

  describe('processMessage', () => {
    it('should process a simple message successfully', async () => {
      const response = await chatService.processMessage(
        mockUserId,
        mockMessage
      );
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });

    it('should handle attachments correctly', async () => {
      const response = await chatService.processMessage(
        mockUserId,
        mockMessage,
        [mockAttachment]
      );
      expect(response).toBeDefined();
      expect(response.content).toContain('analysis');
    });

    it('should use correct AI model based on message content', async () => {
      const technicalMessage = 'Calculate my tax deductions for W2 form';
      const response = await chatService.processMessage(
        mockUserId,
        technicalMessage
      );
      expect(response.source).toBe('claude');
    });

    it('should respect rate limits', async () => {
      const promises = Array(60)
        .fill(null)
        .map(() => chatService.processMessage(mockUserId, mockMessage));

      await expect(Promise.all(promises)).rejects.toThrow('rate limit');
    });
  });

  describe('Context Management', () => {
    it('should maintain conversation context', async () => {
      await chatService.processMessage(mockUserId, 'First message');
      const response = await chatService.processMessage(
        mockUserId,
        'Second message'
      );

      expect(response.content).toBeDefined();
      const context = await chatService['getContext'](mockUserId);
      expect(context.conversationHistory.length).toBeGreaterThan(1);
    });

    it('should handle context updates correctly', async () => {
      const response = await chatService.processMessage(
        mockUserId,
        mockMessage
      );
      const context = await chatService['getContext'](mockUserId);

      expect(context.lastMessage).toBe(mockMessage);
      expect(context.lastResponse).toEqual(response);
    });
  });

  describe('Document Processing', () => {
    it('should process PDF attachments', async () => {
      const pdfAttachment = {
        type: 'pdf',
        content: 'mock pdf content',
        name: 'test.pdf',
      };

      const response = await chatService.processMessage(
        mockUserId,
        'Review this document',
        [pdfAttachment]
      );
      expect(response.content).toBeDefined();
    });

    it('should process multiple attachments', async () => {
      const attachments = [
        { type: 'pdf', content: 'pdf content', name: 'doc1.pdf' },
        { type: 'image', content: 'image data', name: 'doc2.jpg' },
      ];

      const response = await chatService.processMessage(
        mockUserId,
        'Review these documents',
        attachments
      );
      expect(response.content).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle timeout errors gracefully', async () => {
      vi.useFakeTimers();
      const slowMessage = new Promise((resolve) => setTimeout(resolve, 31000));

      await expect(
        chatService.processMessage(mockUserId, 'slow request')
      ).rejects.toThrow('timeout');

      vi.useRealTimers();
    });

    it('should handle invalid attachments', async () => {
      const invalidAttachment = {
        type: 'invalid',
        content: '',
        name: 'test.xyz',
      };

      await expect(
        chatService.processMessage(mockUserId, mockMessage, [invalidAttachment])
      ).rejects.toThrow();
    });
  });
});
