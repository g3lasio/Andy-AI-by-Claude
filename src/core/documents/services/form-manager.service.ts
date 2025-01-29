// src/core/documents/services/form-manager.service.ts

import { FormSearchService } from './form-search.service';
import { FormDownloadService } from './form-download.service';
import { FormMetadata, DownloadResult } from '../interfaces/form.types';
import { logger } from '@/shared/utils/logger';

export class FormManagerService {
  private static instance: FormManagerService;
  private searchService: FormSearchService;
  private downloadService: FormDownloadService;

  private constructor() {
    this.searchService = FormSearchService.getInstance();
    this.downloadService = FormDownloadService.getInstance();
  }

  static getInstance(): FormManagerService {
    if (!FormManagerService.instance) {
      FormManagerService.instance = new FormManagerService();
    }
    return FormManagerService.instance;
  }

  async processFormRequest(
    query: string,
    context: string
  ): Promise<DownloadResult[]> {
    try {
      // 1. Buscar formularios necesarios
      const searchResult = await this.searchService.searchForms(query, context);

      // 2. Descargar cada formulario
      const downloadPromises = searchResult.forms.map((form) =>
        this.downloadService.downloadForm(form)
      );

      // 3. Esperar todas las descargas
      const results = await Promise.all(downloadPromises);

      // 4. Registrar resultados
      this.logResults(results);

      return results;
    } catch (error) {
      logger.error('Error processing form request:', error);
      throw error;
    }
  }

  private logResults(results: DownloadResult[]): void {
    results.forEach((result) => {
      if (result.success) {
        logger.info(`Successfully downloaded form ${result.metadata.id}`);
      } else {
        logger.warn(
          `Failed to download form ${result.metadata.id}, alternative URL provided`
        );
      }
    });
  }
}

export const formManager = FormManagerService.getInstance();
