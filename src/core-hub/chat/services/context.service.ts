
import { ChatSession } from '../interfaces/chat.types';
import { firebaseApp } from '@/shared/config/firebase.config';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  orderBy,
  limit,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';

export class ContextService {
  private static instance: ContextService;
  private db = getFirestore(firebaseApp);
  private readonly SESSIONS_COLLECTION = 'sessions';
  private readonly MAX_SESSION_AGE_DAYS = 30;

  private constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await getFirestore(firebaseApp);
      logger.info('ContextService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ContextService:', error);
      throw new AppError('SERVICE_INIT_ERROR', 'Failed to initialize ContextService');
    }
  }

  static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  async getSessionContext(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessionRef = doc(this.db, this.SESSIONS_COLLECTION, sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        logger.warn(`Session not found: ${sessionId}`);
        return null;
      }

      const session = this.validateAndTransformSession(sessionDoc);
      await this.updateLastAccessed(sessionId);
      return session;
    } catch (error) {
      logger.error('Error retrieving session context:', error);
      throw new AppError('CONTEXT_RETRIEVAL_ERROR', 'Failed to retrieve session context');
    }
  }

  private validateAndTransformSession(doc: DocumentSnapshot): ChatSession {
    const data = doc.data();
    if (!data) {
      throw new AppError('INVALID_SESSION', 'Session data is invalid');
    }

    return {
      id: doc.id,
      userId: data.userId,
      messages: data.messages || [],
      context: {
        lastInteraction: data.context?.lastInteraction || Date.now(),
        pendingActions: data.context?.pendingActions || [],
        activeModule: data.context?.activeModule,
      },
      metadata: {
        createdAt: data.metadata?.createdAt || Date.now(),
        lastAccessed: data.metadata?.lastAccessed || Date.now(),
        sessionType: data.metadata?.sessionType || 'general',
      }
    };
  }

  async updateSessionContext(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<void> {
    try {
      const sessionRef = doc(this.db, this.SESSIONS_COLLECTION, sessionId);
      const timestamp = Timestamp.now();
      
      const sanitizedUpdates = {
        ...updates,
        metadata: {
          ...updates.metadata,
          lastModified: timestamp,
        }
      };

      await updateDoc(sessionRef, sanitizedUpdates);
      logger.info(`Session ${sessionId} updated successfully`);
    } catch (error) {
      logger.error('Error updating session context:', error);
      throw new AppError('CONTEXT_UPDATE_ERROR', 'Failed to update session context');
    }
  }

  async createNewSession(userId: string, type: string = 'general'): Promise<ChatSession> {
    try {
      const sessionId = `session_${Date.now()}_${userId}`;
      const timestamp = Timestamp.now();

      const newSession: ChatSession = {
        id: sessionId,
        userId,
        messages: [],
        context: {
          lastInteraction: timestamp.toMillis(),
          pendingActions: [],
          activeModule: null,
        },
        metadata: {
          createdAt: timestamp.toMillis(),
          lastAccessed: timestamp.toMillis(),
          sessionType: type,
        }
      };

      const sessionRef = doc(this.db, this.SESSIONS_COLLECTION, sessionId);
      await setDoc(sessionRef, newSession);
      logger.info(`New session created: ${sessionId}`);

      return newSession;
    } catch (error) {
      logger.error('Error creating new session:', error);
      throw new AppError('SESSION_CREATION_ERROR', 'Failed to create new session');
    }
  }

  async getUserSessions(userId: string, active: boolean = true): Promise<ChatSession[]> {
    try {
      const sessionsQuery = query(
        collection(this.db, this.SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('metadata.lastAccessed', '>=', Date.now() - (this.MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000)),
        orderBy('metadata.lastAccessed', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(sessionsQuery);
      return snapshot.docs.map(doc => this.validateAndTransformSession(doc));
    } catch (error) {
      logger.error('Error retrieving user sessions:', error);
      throw new AppError('SESSION_RETRIEVAL_ERROR', 'Failed to retrieve user sessions');
    }
  }

  private async updateLastAccessed(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(this.db, this.SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        'metadata.lastAccessed': Timestamp.now().toMillis(),
      });
    } catch (error) {
      logger.warn('Failed to update last accessed timestamp:', error);
    }
  }
}

export const contextService = ContextService.getInstance();
