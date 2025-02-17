
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { PredictiveHubService } from '../predictive-hub.service';

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ 
          text: JSON.stringify([
            {
              type: 'FINANCIAL',
              severity: 'LOW',
              probability: 0.2,
              impact: 0.3,
              description: 'Mock risk'
            }
          ]),
          role: 'assistant' 
        }],
      }),
    },
  })),
}));

describe('PredictiveHubService', () => {
  let predictiveService: PredictiveHubService;
  let mockUserId: string;

  beforeEach(() => {
    predictiveService = PredictiveHubService.getInstance();
    mockUserId = 'test-user-123';
  });

  describe('Risk Analysis', () => {
    it('should analyze risks successfully', async () => {
      const context = 'financial planning context';
      const risks = await predictiveService.analyzeRisks(mockUserId, context);
      expect(risks).toBeDefined();
      expect(risks[0].type).toBe('FINANCIAL');
    });
  });

  describe('Strategy Optimization', () => {
    it('should optimize credit strategy', async () => {
      const result = await predictiveService.optimizeStrategy(
        mockUserId,
        'CREDIT',
        ['improve_score', 'reduce_debt']
      );
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should optimize tax strategy', async () => {
      const result = await predictiveService.optimizeStrategy(
        mockUserId,
        'TAX',
        ['maximize_deductions']
      );
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});
