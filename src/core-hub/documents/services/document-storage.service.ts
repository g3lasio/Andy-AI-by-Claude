import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface DocumentMetadata {
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  hash: string;
}

export default class DocumentStorageService {
  private static instance: DocumentStorageService;
  private storagePath: string;

  private constructor() {
    this.storagePath = path.join(__dirname, '../../../storage/documents');
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  public static getInstance(): DocumentStorageService {
    if (!this.instance) {
      this.instance = new DocumentStorageService();
    }
    return this.instance;
  }

  /**
   * Guarda un documento en el sistema de almacenamiento.
   * @param fileName Nombre del archivo.
   * @param fileData Contenido binario del archivo.
   * @returns Metadatos del archivo guardado.
   */
  public saveDocument(fileName: string, fileData: Buffer): DocumentMetadata {
    const filePath = path.join(this.storagePath, fileName);
    fs.writeFileSync(filePath, fileData);

    const stats = fs.statSync(filePath);
    const hash = crypto.createHash('sha256').update(fileData).digest('hex');

    return {
      name: fileName,
      type: path.extname(fileName),
      size: stats.size,
      createdAt: stats.birthtime,
      hash: hash,
    };
  }

  /**
   * Recupera un documento almacenado.
   * @param fileName Nombre del archivo.
   * @returns Buffer del documento.
   */
  public getDocument(fileName: string): Buffer {
    const filePath = path.join(this.storagePath, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${fileName} no existe en el almacenamiento.`);
    }
    return fs.readFileSync(filePath);
  }

  /**
   * Elimina un documento del almacenamiento.
   * @param fileName Nombre del archivo.
   */
  public deleteDocument(fileName: string): void {
    const filePath = path.join(this.storagePath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Documento ${fileName} eliminado correctamente.`);
    } else {
      console.warn(`El documento ${fileName} no existe.`);
    }
  }

  /**
   * Lista todos los documentos almacenados.
   * @returns Lista de metadatos de los documentos.
   */
  public listDocuments(): DocumentMetadata[] {
    const files = fs.readdirSync(this.storagePath);
    return files.map((file) => {
      const filePath = path.join(this.storagePath, file);
      const stats = fs.statSync(filePath);
      const fileData = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileData).digest('hex');

      return {
        name: file,
        type: path.extname(file),
        size: stats.size,
        createdAt: stats.birthtime,
        hash: hash,
      };
    });
  }
}
