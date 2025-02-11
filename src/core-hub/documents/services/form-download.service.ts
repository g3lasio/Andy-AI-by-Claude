// src/core/documents/services/form-download.service.ts

import { DownloadResult, FormMetadata } from '../interfaces/form.types';
import axios from 'axios';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';

export class FormDownloadService {
  private static instance: FormDownloadService;
  private cache: Map<string, Buffer> = new Map();

  static getInstance(): FormDownloadService {
    if (!FormDownloadService.instance) {
      FormDownloadService.instance = new FormDownloadService();
    }
    return FormDownloadService.instance;
  }

  async downloadForm(metadata: FormMetadata): Promise<DownloadResult> {
    try {
      const url = await this.findDownloadUrl(metadata);
      const buffer = await this.downloadFile(url);

      return {
        success: true,
        url,
        metadata,
      };
    } catch (error) {
      logger.error(`Error downloading form ${metadata.id}:`, error);
      const alternativeUrl = await this.findAlternativeUrl(metadata);

      return {
        success: false,
        alternativeUrl,
        error: error.message,
        metadata,
      };
    }
  }

  private async findDownloadUrl(metadata: FormMetadata): Promise<string> {
    // Implementar búsqueda de URL de descarga
    return '';
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    return Buffer.from(response.data);
  }

  private async findAlternativeUrl(metadata: FormMetadata): Promise<string> {
    // Implementar búsqueda de URL alternativa
    return '';
  }
}
