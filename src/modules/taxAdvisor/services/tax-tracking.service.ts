
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { retry } from '@/shared/utils/retry';
import { firebaseApp } from '@/shared/config/firebase.config';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

interface SubmissionStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'REFUND_ISSUED';
  submissionDate: Date;
  lastUpdated: Date;
  estimatedCompletionDate?: Date;
  refundAmount?: number;
  messages?: Array<{
    date: Date;
    content: string;
    type: 'INFO' | 'WARNING' | 'ERROR';
  }>;
}

interface DeadlineInfo {
  type: 'FILING' | 'PAYMENT' | 'EXTENSION' | 'AMENDMENT';
  dueDate: Date;
  description: string;
  status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  reminderDates: Date[];
}

export class TaxTrackingService {
  private anthropic: Anthropic;
  private db = getFirestore(firebaseApp);
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async trackSubmissionStatus(submissionId: string): Promise<SubmissionStatus> {
    try {
      const submissionRef = doc(this.db, 'submissions', submissionId);
      const submission = await getDoc(submissionRef);

      if (!submission.exists()) {
        throw new AppError('SUBMISSION_NOT_FOUND', 'Submission not found');
      }

      const status = submission.data() as SubmissionStatus;
      const updatedStatus = await this.analyzeSubmissionStatus(status);
      
      await updateDoc(submissionRef, {
        ...updatedStatus,
        lastUpdated: Timestamp.now()
      });

      return updatedStatus;
    } catch (error) {
      logger.error('Error tracking submission status:', error);
      throw new AppError('TRACKING_ERROR', 'Failed to track submission status');
    }
  }

  async monitorDeadlines(userId: string): Promise<DeadlineInfo[]> {
    try {
      const userRef = doc(this.db, 'users', userId);
      const user = await getDoc(userRef);

      if (!user.exists()) {
        throw new AppError('USER_NOT_FOUND', 'User not found');
      }

      const deadlines = await this.calculateDeadlines(user.data());
      const prioritizedDeadlines = this.prioritizeDeadlines(deadlines);
      
      await this.scheduleReminders(userId, prioritizedDeadlines);
      
      return prioritizedDeadlines;
    } catch (error) {
      logger.error('Error monitoring deadlines:', error);
      throw new AppError('DEADLINE_ERROR', 'Failed to monitor deadlines');
    }
  }

  private async analyzeSubmissionStatus(status: SubmissionStatus): Promise<SubmissionStatus> {
    const response = await retry(
      async () => {
        return await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          messages: [{
            role: 'user',
            content: `Analyze tax submission status and provide recommendations:
              ${JSON.stringify(status)}`
          }]
        });
      },
      this.MAX_RETRIES
    );

    return {
      ...status,
      ...JSON.parse(response.content[0].text)
    };
  }

  private async calculateDeadlines(userData: any): Promise<DeadlineInfo[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [{
        role: 'user',
        content: `Calculate tax deadlines based on user profile:
          ${JSON.stringify(userData)}`
      }]
    });

    return JSON.parse(response.content[0].text);
  }

  private prioritizeDeadlines(deadlines: DeadlineInfo[]): DeadlineInfo[] {
    return deadlines.sort((a, b) => {
      // Sort by due date first
      const dateComparison = a.dueDate.getTime() - b.dueDate.getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Then by importance
      const importanceMap = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return importanceMap[a.importance] - importanceMap[b.importance];
    });
  }

  private async scheduleReminders(userId: string, deadlines: DeadlineInfo[]): Promise<void> {
    const reminderRef = doc(this.db, 'reminders', userId);
    await updateDoc(reminderRef, {
      deadlines: deadlines.map(deadline => ({
        ...deadline,
        reminderDates: this.calculateReminderDates(deadline.dueDate)
      })),
      lastUpdated: Timestamp.now()
    });
  }

  private calculateReminderDates(dueDate: Date): Date[] {
    const reminderDates: Date[] = [];
    const now = new Date();
    
    // 30 days before
    reminderDates.push(new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000));
    // 7 days before
    reminderDates.push(new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    // 1 day before
    reminderDates.push(new Date(dueDate.getTime() - 24 * 60 * 60 * 1000));
    
    // Only return future dates
    return reminderDates.filter(date => date > now);
  }
}
