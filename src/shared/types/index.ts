// Tipos base para el chat
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

// Tipos para el contexto de usuario
export interface UserContext {
  userId: string;
  sessionId: string;
  preferences?: UserPreferences;
}

// Tipos para módulos
export interface ModuleAction {
  type: 'TAX' | 'FINANCIAL' | 'CREDIT';
  action: string;
  params: Record<string, any>;
}
