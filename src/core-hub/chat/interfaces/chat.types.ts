// src/core/chat/interfaces/chat.types.ts

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  metadata?: {
    moduleType?: 'TAX' | 'FINANCIAL' | 'CREDIT';
    requiresAction?: boolean;
    actionType?: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  context: {
    activeModule?: string;
    lastInteraction: number;
    pendingActions?: string[];
  };
}

export interface ChatResponse {
  message: string;
  actions?: {
    type: string;
    payload: any;
  }[];
  requiresUserApproval?: boolean;
}
