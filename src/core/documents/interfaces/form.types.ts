// src/core/documents/interfaces/form.types.ts

export interface FormMetadata {
  id: string;
  name: string;
  year: string;
  agency: 'IRS' | 'STATE' | 'OTHER';
  category: 'TAX' | 'CREDIT' | 'BUSINESS' | 'PERSONAL';
  required: boolean;
}

export interface DownloadResult {
  success: boolean;
  url?: string;
  alternativeUrl?: string;
  error?: string;
  metadata: FormMetadata;
}

export interface SearchResult {
  forms: FormMetadata[];
  source: string;
  timestamp: number;
}
