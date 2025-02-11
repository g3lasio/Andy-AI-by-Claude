import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface EncryptedDocument {
  name: string;
  encryptedPath: string;
  decryptedPath?: string;
  encryptionAlgorithm: string;
  processedAt: Date;
}

export default class DocumentEncryptionService {
  private static instance: DocumentEncryptionService;
  private encryptionKey: Buffer;
  private algorithm: string;

  private constructor() {
    this.algorithm = 'aes-256-cbc';
    this.encryptionKey = crypto.scryptSync(
      process.env.ENCRYPTION_SECRET || 'default_secret',
      'salt',
      32
    );
  }

  public static getInstance(): DocumentEncryptionService {
    if (!this.instance) {
      this.instance = new DocumentEncryptionService();
    }
    return this.instance;
  }

  /**
   * Cifra un documento y lo almacena en una ruta segura.
   * @param filePath Ruta del archivo original.
   * @returns Información del documento cifrado.
   */
  public encryptDocument(filePath: string): EncryptedDocument {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe.`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );
    const input = fs.readFileSync(filePath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

    const encryptedFilePath = `${filePath}.enc`;
    fs.writeFileSync(encryptedFilePath, Buffer.concat([iv, encrypted]));

    return {
      name: path.basename(filePath),
      encryptedPath: encryptedFilePath,
      encryptionAlgorithm: this.algorithm,
      processedAt: new Date(),
    };
  }

  /**
   * Descifra un documento cifrado.
   * @param encryptedFilePath Ruta del archivo cifrado.
   * @returns Información del documento descifrado.
   */
  public decryptDocument(encryptedFilePath: string): EncryptedDocument {
    if (!fs.existsSync(encryptedFilePath)) {
      throw new Error(`El archivo cifrado ${encryptedFilePath} no existe.`);
    }

    const encryptedData = fs.readFileSync(encryptedFilePath);
    const iv = encryptedData.slice(0, 16);
    const encryptedText = encryptedData.slice(16);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    const decryptedFilePath = encryptedFilePath.replace('.enc', '.dec');
    fs.writeFileSync(decryptedFilePath, decrypted);

    return {
      name: path.basename(encryptedFilePath, '.enc'),
      encryptedPath: encryptedFilePath,
      decryptedPath: decryptedFilePath,
      encryptionAlgorithm: this.algorithm,
      processedAt: new Date(),
    };
  }
}
