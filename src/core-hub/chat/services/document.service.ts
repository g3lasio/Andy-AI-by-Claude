
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '@/shared/config/firebase.config';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/utils/error-handler';
import { Anthropic } from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';
import { createWorker } from 'tesseract.js';

interface DocumentMetadata {
  id: string;
  type: string;
  documentType?: 'W2' | '1099' | 'ID' | 'PASSPORT' | 'ITIN' | 'SSN' | 'BANK_STATEMENT' | 'OTHER';
  size: number;
  uploadedAt: number;
  userId: string;
  mimeType: string;
  fileName: string;
  processingStatus: 'pending' | 'processed' | 'error';
  checksum: string;
  version: number;
  tags: string[];
  validationStatus?: 'valid' | 'invalid' | 'pending';
  validationDetails?: {
    confidence: number;
    issues?: string[];
    lastValidated: number;
  };
}

interface ProcessingResult {
  url: string;
  analysis: string;
  metadata: DocumentMetadata;
  extractedText: string;
  confidence: number;
}

export class DocumentService {
  private static instance: DocumentService;
  private storage = getStorage(firebaseApp);
  private anthropic: Anthropic;
  private readonly ALLOWED_FILE_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_FILES_PER_UPLOAD = 7;
  private readonly db = getFirestore(firebaseApp);

  private constructor() {
    this.initializeService();
  }

  private async validateUploadLimit(userId: string): Promise<void> {
    const userUploadsRef = collection(this.db, 'users', userId, 'documents');
    const uploadedDocs = await getDocs(userUploadsRef);
    
    if (uploadedDocs.size >= this.MAX_FILES_PER_UPLOAD) {
      throw new AppError('UPLOAD_LIMIT_EXCEEDED', 'Maximum number of documents (7) already uploaded');
    }
  }

  private async classifyDocument(content: string, fileName: string): Promise<DocumentMetadata['documentType']> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Classify this document based on its content and filename. The document should be classified as one of: W2, 1099, ID, PASSPORT, ITIN, SSN, BANK_STATEMENT, or OTHER. Content: ${content}\nFilename: ${fileName}`
      }]
    });

    return response.content[0].text as DocumentMetadata['documentType'];
  }

  private async initializeService(): Promise<void> {
    try {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY as string,
      });
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
    } catch (error) {
      logger.error('Failed to initialize DocumentService:', error);
      throw new AppError('SERVICE_INIT_ERROR', 'Failed to initialize document service');
    }
  }

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  async processUploadedFile(
    userId: string,
    file: Buffer | File,
    fileName: string,
    tags: string[] = []
  ): Promise<ProcessingResult> {
    await this.validateUploadLimit(userId);
    try {
      const mimeType = this.getMimeType(fileName);
      await this.validateFile(file, mimeType);

      const metadata = await this.createMetadata(userId, file, fileName, mimeType, tags);
      const url = await this.uploadDocument(userId, file, fileName, metadata);
      const content = await this.extractContent(file, mimeType);
      const analysis = await this.analyzeWithClaude(content, metadata);

      return {
        url,
        analysis,
        metadata,
        extractedText: content,
        confidence: this.calculateConfidence(content)
      };
    } catch (error) {
      logger.error('Error processing file:', error);
      throw new AppError('FILE_PROCESSING_ERROR', 'Error processing file');
    }
  }

  private async validateFile(file: Buffer | File, mimeType: string): Promise<void> {
    if (!file) {
      throw new AppError('INVALID_FILE', 'File is required');
    }

    if (!mimeType || !this.ALLOWED_FILE_TYPES.has(mimeType)) {
      throw new AppError('INVALID_FILE_TYPE', `Unsupported file type: ${mimeType}. Allowed types: ${Array.from(this.ALLOWED_FILE_TYPES).join(', ')}`);
    }

    const size = file instanceof Buffer ? file.length : file.size;
    if (size === 0) {
      throw new AppError('EMPTY_FILE', 'File cannot be empty');
    }

    if (size > this.MAX_FILE_SIZE) {
      throw new AppError('FILE_TOO_LARGE', `File size (${size} bytes) exceeds maximum limit of ${this.MAX_FILE_SIZE} bytes`);
    }

    try {
      if (file instanceof Buffer) {
        await this.validateFileContent(file);
      } else {
        const buffer = await file.arrayBuffer();
        await this.validateFileContent(Buffer.from(buffer));
      }
    } catch (error) {
      throw new AppError('FILE_VALIDATION_ERROR', `File content validation failed: ${error.message}`);
    }
  }

  private async validateFileContent(buffer: Buffer): Promise<void> {
    // Validar que el archivo no esté corrupto
    if (buffer.length < 4) {
      throw new Error('Invalid file format: file too small');
    }

    // Verificar firmas de archivo comunes
    const header = buffer.slice(0, 4).toString('hex');
    const validSignatures = {
      pdf: '25504446', // %PDF
      png: '89504e47', // PNG
      jpeg: ['ffd8ffe0', 'ffd8ffe1'], // JPEG
    };

    for (const [type, signatures] of Object.entries(validSignatures)) {
      if (Array.isArray(signatures)) {
        if (signatures.includes(header)) {
          return;
        }
      } else if (header === signatures) {
        return;
      }
    }
  }

  private async createMetadata(
    userId: string,
    file: Buffer | File,
    fileName: string,
    mimeType: string,
    tags: string[]
  ): Promise<DocumentMetadata> {
    const size = file instanceof Buffer ? file.length : file.size;
    return {
      id: `doc_${Date.now()}_${userId}`,
      type: mimeType.split('/')[1],
      size,
      uploadedAt: Date.now(),
      userId,
      mimeType,
      fileName,
      processingStatus: 'pending',
      checksum: await this.calculateChecksum(file),
      version: 1,
      tags
    };
  }

  private async calculateChecksum(file: Buffer | File): Promise<string> {
    const content = file instanceof Buffer ? file : await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', content);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async uploadDocument(
    userId: string,
    file: Buffer | File,
    fileName: string,
    metadata: DocumentMetadata
  ): Promise<string> {
    const path = `documents/${userId}/${metadata.id}/${fileName}`;
    const fileRef = ref(this.storage, path);
    
    const fileBuffer = file instanceof Buffer ? file : await file.arrayBuffer();
    await uploadBytes(fileRef, fileBuffer, {
      customMetadata: {
        userId,
        originalName: fileName,
        ...metadata
      }
    });

    return await getDownloadURL(fileRef);
  }

  private async extractContent(file: Buffer | File, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractPdfContent(file);
        case 'text/csv':
          return await this.extractCsvContent(file);
        case 'image/png':
        case 'image/jpeg':
        case 'image/svg+xml':
          return await this.extractImageContent(file);
        default:
          return await this.extractTextContent(file);
      }
    } catch (error) {
      logger.error('Error extracting content:', error);
      throw new AppError('CONTENT_EXTRACTION_ERROR', 'Failed to extract content');
    }
  }

  private async extractPdfContent(file: Buffer | File): Promise<string> {
    const arrayBuffer = file instanceof Buffer ? file.buffer : await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  }

  private async extractCsvContent(file: Buffer | File): Promise<string> {
    const content = file instanceof Buffer 
      ? file.toString('utf-8')
      : await file.text();
    
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true
    });

    return JSON.stringify(result.data, null, 2);
  }

  private async extractImageContent(file: Buffer | File): Promise<string> {
    const worker = await createWorker('eng');
    const buffer = file instanceof Buffer ? file : await file.arrayBuffer();
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
  }

  private async extractTextContent(file: Buffer | File): Promise<string> {
    return file instanceof Buffer 
      ? file.toString('utf-8')
      : await file.text();
  }

  private async analyzeWithClaude(
    content: string,
    metadata: DocumentMetadata
  ): Promise<string> {
    try {
      const documentType = await this.classifyDocument(content, metadata.fileName);
      metadata.documentType = documentType;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Analyze this ${documentType} document. Extract and validate all relevant financial/tax information. For W2/1099: verify income amounts, tax withholdings, and employer details. For ID/PASSPORT: verify expiration and document validity. For bank statements: analyze transactions and balances.\n\nDocument content:\n${content}`
          }
        ]
      });

      const analysis = response.content[0].text;
      await this.updateDocumentInFirebase(metadata.id, {
        ...metadata,
        validationStatus: 'processed',
        validationDetails: {
          confidence: this.calculateConfidence(content),
          lastValidated: Date.now()
        }
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing with Claude:', error);
      throw new AppError('ANALYSIS_ERROR', 'Failed to analyze document');
    }
  }

  private calculateConfidence(content: string): number {
    const wordCount = content.split(/\s+/).length;
    const characterCount = content.length;
    
    if (wordCount === 0 || characterCount === 0) {
      return 0;
    }

    // Calcula la confianza basada en la longitud y complejidad del contenido
    const avgWordLength = characterCount / wordCount;
    const confidence = Math.min(
      (wordCount / 1000) * 0.5 + (avgWordLength / 10) * 0.5,
      1
    );

    return confidence;
  }
}

export const documentService = DocumentService.getInstance();
