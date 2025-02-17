import { ModuleAction } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { contextService } from './context.service';
import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export class ActionService {
  private static instance: ActionService;
  private readonly ALLOWED_PATHS = ['/src', '/public', '/scripts'];
  private readonly PROTECTED_FILES = ['.env', '.env.local', 'package.json', '.replit'];

  private constructor() {}

  static getInstance(): ActionService {
    if (!ActionService.instance) {
      ActionService.instance = new ActionService();
    }
    return ActionService.instance;
  }

  async executeAction(action: ModuleAction, userId: string): Promise<boolean> {
    try {
      logger.info('Executing action:', { action, userId });

      const userApproval = await this.verifyUserApproval(action, userId);
      if (!userApproval) {
        throw new AppError('ACTION_UNAUTHORIZED', 'User did not approve this action');
      }

      await this.logActionStart(action, userId);

      switch (action.type) {
        case 'SYSTEM':
          return await this.executeSystemAction(action, userId);
        case 'TAX':
          return await this.executeTaxAction(action, userId);
        case 'FINANCIAL':
          return await this.executeFinancialAction(action, userId);
        case 'CREDIT':
          return await this.executeCreditAction(action, userId);
        default:
          throw new AppError('INVALID_ACTION', 'Unsupported action type');
      }
    } catch (error) {
      logger.error('Error executing action:', error);
      await this.logActionError(action, userId, error);
      throw new AppError('ACTION_EXECUTION_ERROR', 'Failed to execute action');
    }
  }

  private async executeSystemAction(action: ModuleAction, userId: string): Promise<boolean> {
    const { params } = action;

    switch (action.action) {
      case 'MODIFY_FILE':
        return await this.modifyFile(params.filePath, params.content, userId);
      case 'CREATE_FILE':
        return await this.createFile(params.filePath, params.content, userId);
      case 'DELETE_FILE':
        return await this.deleteFile(params.filePath, userId);
      case 'EXECUTE_COMMAND':
        return await this.executeCommand(params.command, userId);
      default:
        throw new AppError('INVALID_SYSTEM_ACTION', 'Unsupported system action');
    }
  }

  private async modifyFile(filePath: string, content: string, userId: string): Promise<boolean> {
    if (!this.isPathAllowed(filePath)) {
      throw new AppError('INVALID_PATH', 'Path not allowed for modification');
    }

    try {
      const fullPath = join(process.cwd(), filePath);
      writeFileSync(fullPath, content, 'utf8');
      await this.logSystemChange(userId, `Modified file: ${filePath}`);
      return true;
    } catch (error) {
      throw new AppError('FILE_MODIFICATION_ERROR', `Failed to modify file: ${filePath}`);
    }
  }

  private async createFile(filePath: string, content: string, userId: string): Promise<boolean> {
    if (!this.isPathAllowed(filePath)) {
      throw new AppError('INVALID_PATH', 'Path not allowed for file creation');
    }

    try {
      const fullPath = join(process.cwd(), filePath);
      writeFileSync(fullPath, content, 'utf8');
      await this.logSystemChange(userId, `Created file: ${filePath}`);
      return true;
    } catch (error) {
      throw new AppError('FILE_CREATION_ERROR', `Failed to create file: ${filePath}`);
    }
  }

  private async deleteFile(filePath: string, userId: string): Promise<boolean> {
    if (!this.isPathAllowed(filePath)) {
      throw new AppError('INVALID_PATH', 'Path not allowed for deletion');
    }
    // Add actual file deletion logic here.  For simplicity, this is a placeholder.
    try {
      //Implementation to delete file
      await this.logSystemChange(userId, `Deleted file: ${filePath}`);
      return true;
    } catch (error) {
      throw new AppError('FILE_DELETION_ERROR', `Failed to delete file: ${filePath}`);
    }
  }

  private async executeCommand(command: string, userId: string): Promise<boolean> {
    const allowedCommands = ['npm', 'yarn', 'pnpm', 'node'];
    const commandBase = command.split(' ')[0];

    if (!allowedCommands.includes(commandBase)) {
      throw new AppError('INVALID_COMMAND', 'Command not allowed');
    }

    try {
      const { stdout, stderr } = await execAsync(command);
      await this.logSystemChange(userId, `Executed command: ${command}\nOutput: ${stdout}`);
      return true;
    } catch (error) {
      throw new AppError('COMMAND_EXECUTION_ERROR', `Failed to execute command: ${command}`);
    }
  }

  private isPathAllowed(path: string): boolean {
    if (this.PROTECTED_FILES.some(file => path.includes(file))) {
      return false;
    }
    return this.ALLOWED_PATHS.some(allowedPath => path.startsWith(allowedPath));
  }

  private async logSystemChange(userId: string, change: string): Promise<void> {
    await contextService.updateSessionContext(userId, {
      context: {
        lastSystemChange: change,
        timestamp: Date.now()
      }
    });
  }

  private async verifyUserApproval(action: ModuleAction, userId: string): Promise<boolean> {
    const riskLevel = this.calculateActionRisk(action);
    const userPreferences = await this.getUserAutomationPreferences(userId);
    
    if (riskLevel <= userPreferences.automationThreshold) {
      return true;
    }

    if (action.type === 'SYSTEM' && action.metadata?.isReversible) {
      const context = await contextService.getSessionContext(userId);
      return context?.metadata?.allowAutomatedActions || false;
    }

    return await this.requestUserConfirmation(userId, action);
  }

  private calculateActionRisk(action: ModuleAction): number {
    const riskFactors = {
      FINANCIAL: 0.8,
      TAX: 0.9,
      SYSTEM: 0.5,
      DOCUMENT: 0.6
    };

    return riskFactors[action.type] || 0.7;
  }

  private async getUserAutomationPreferences(userId: string): Promise<{
    automationThreshold: number;
    allowedActions: string[];
  }> {
    const userDoc = await this.db.collection('users').doc(userId).get();
    return userDoc.data()?.automationPreferences || {
      automationThreshold: 0.5,
      allowedActions: ['READ', 'ANALYZE', 'SUGGEST']
    };
  }

  private async requestUserConfirmation(userId: string, action: ModuleAction): Promise<boolean> {
    // Implementar sistema de confirmación en tiempo real
    // Por ahora retornamos false para acciones de alto riesgo
    return action.metadata?.riskLevel < 0.8;
  }

  private async logActionStart(action: ModuleAction, userId: string): Promise<void> {
    await contextService.updateSessionContext(userId, {
      context: {
        lastAction: action,
        actionStatus: 'STARTED',
        timestamp: Date.now()
      }
    });
  }

  private async logActionError(action: ModuleAction, userId: string, error: any): Promise<void> {
    await contextService.updateSessionContext(userId, {
      context: {
        lastAction: action,
        actionStatus: 'ERROR',
        error: error.message,
        timestamp: Date.now()
      }
    });
  }

  private async executeTaxAction(action: ModuleAction, userId: string): Promise<boolean> {
    const { params } = action;
    switch (action.action) {
      case 'SUBMIT_FORM':
        return await this.submitTaxForm(params, userId);
      case 'UPDATE_PROFILE':
        return await this.updateTaxProfile(params, userId);
      case 'CALCULATE_DEDUCTIONS':
        return await this.calculateDeductions(params, userId);
      default:
        throw new AppError('INVALID_TAX_ACTION', 'Unsupported tax action');
    }
  }

  private async executeFinancialAction(action: ModuleAction, userId: string): Promise<boolean> {
    const { params } = action;
    switch (action.action) {
      case 'UPDATE_BUDGET':
        return await this.updateBudget(params, userId);
      case 'CREATE_SAVINGS_GOAL':
        return await this.createSavingsGoal(params, userId);
      case 'ANALYZE_EXPENSES':
        return await this.analyzeExpenses(params, userId);
      default:
        throw new AppError('INVALID_FINANCIAL_ACTION', 'Unsupported financial action');
    }
  }

  private async executeCreditAction(action: ModuleAction, userId: string): Promise<boolean> {
    const { params } = action;
    switch (action.action) {
      case 'DISPUTE_TRANSACTION':
        return await this.disputeTransaction(params, userId);
      case 'UPDATE_CREDIT_PROFILE':
        return await this.updateCreditProfile(params, userId);
      case 'ANALYZE_SCORE':
        return await this.analyzeCreditScore(params, userId);
      default:
        throw new AppError('INVALID_CREDIT_ACTION', 'Unsupported credit action');
    }
  }

  private async submitTaxForm(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async updateTaxProfile(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async calculateDeductions(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async updateBudget(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async createSavingsGoal(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async analyzeExpenses(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async disputeTransaction(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async updateCreditProfile(params: any, userId: string): Promise<boolean> {
    return true;
  }

  private async analyzeCreditScore(params: any, userId: string): Promise<boolean> {
    return true;
  }
}

export const actionService = ActionService.getInstance();