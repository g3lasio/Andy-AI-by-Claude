
import { storage, db } from '@/shared/config/firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { logger } from '@/shared/utils/logger';
import { retry } from '@/shared/utils/retry';
import { AppError } from '@/shared/utils/error-handler';

export interface DocumentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: number;
  userId: string;
  checksum: string;
  url?: string;
}

export class DocumentStorageService {
  private static instance: DocumentStorageService;

  private constructor() {}

  public static getInstance(): DocumentStorageService {
    if (!DocumentStorageService.instance) {
      DocumentStorageService.instance = new DocumentStorageService();
    }
    return DocumentStorageService.instance;
  }

  async uploadDocument(
    userId: string,
    file: Buffer,
    fileName: string,
    metadata: Partial<DocumentMetadata>
  ): Promise<DocumentMetadata> {
    try {
      const filePath = `documents/${userId}/${Date.now()}_${fileName}`;
      const storageRef = ref(storage, filePath);
      
      // Subir archivo con retry
      await retry(async () => {
        await uploadBytes(storageRef, file);
      }, { retries: 3 });

      // Obtener URL
      const url = await getDownloadURL(storageRef);

      const docMetadata: DocumentMetadata = {
        id: `doc_${Date.now()}`,
        name: fileName,
        type: fileName.split('.').pop() || 'unknown',
        size: file.length,
        path: filePath,
        uploadedAt: Date.now(),
        userId,
        checksum: this.calculateChecksum(file),
        url,
        ...metadata
      };

      // Guardar metadata en Firestore
      await setDoc(doc(db, 'documents', docMetadata.id), docMetadata);

      logger.info(`Documento ${fileName} subido exitosamente`);
      return docMetadata;
    } catch (error) {
      logger.error('Error al subir documento:', error);
      throw new AppError('UPLOAD_ERROR', 'Error al subir documento');
    }
  }

  async getDocument(documentId: string): Promise<DocumentMetadata> {
    try {
      const docRef = doc(db, 'documents', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new AppError('NOT_FOUND', 'Documento no encontrado');
      }

      return docSnap.data() as DocumentMetadata;
    } catch (error) {
      logger.error('Error al obtener documento:', error);
      throw new AppError('FETCH_ERROR', 'Error al obtener documento');
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const docData = await this.getDocument(documentId);
      const storageRef = ref(storage, docData.path);

      // Eliminar archivo de Storage
      await deleteObject(storageRef);
      
      // Eliminar metadata de Firestore
      await deleteDoc(doc(db, 'documents', documentId));

      logger.info(`Documento ${documentId} eliminado exitosamente`);
    } catch (error) {
      logger.error('Error al eliminar documento:', error);
      throw new AppError('DELETE_ERROR', 'Error al eliminar documento');
    }
  }

  private calculateChecksum(file: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(file).digest('hex');
  }
}

export const documentStorage = DocumentStorageService.getInstance();
