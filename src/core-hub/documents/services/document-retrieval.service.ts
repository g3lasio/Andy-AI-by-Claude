import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';

interface DocumentMetadata {
  name: string;
  type: string;
  size: number;
  createdAt: Date;
}

export default class DocumentRetrievalService {
  private static instance: DocumentRetrievalService;
  private openai: OpenAI;
  private ocrWorker: any;

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.ocrWorker = createWorker();
  }

  public static getInstance(): DocumentRetrievalService {
    if (!this.instance) {
      this.instance = new DocumentRetrievalService();
    }
    return this.instance;
  }

  /**
   * Lista todos los documentos en un directorio específico
   * @param directory Ruta del directorio
   * @returns Lista de metadatos de documentos
   */
  public async listDocuments(directory: string): Promise<DocumentMetadata[]> {
    if (!fs.existsSync(directory)) {
      throw new Error(`El directorio ${directory} no existe.`);
    }

    const files = fs.readdirSync(directory);
    return files.map((file) => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        type: path.extname(file),
        size: stats.size,
        createdAt: stats.birthtime,
      };
    });
  }

  /**
   * Carga un documento PDF desde el sistema de archivos.
   * @param filePath Ruta del archivo PDF.
   * @returns Instancia del PDF cargado.
   */
  public async loadPDF(filePath: string): Promise<PDFDocument> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe.`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    return await PDFDocument.load(fileBuffer);
  }

  /**
   * Extrae texto de una imagen usando OCR
   * @param imagePath Ruta de la imagen
   * @returns Texto extraído
   */
  public async extractTextFromImage(imagePath: string): Promise<string> {
    await this.ocrWorker.load();
    await this.ocrWorker.loadLanguage('eng');
    await this.ocrWorker.initialize('eng');
    const { data } = await this.ocrWorker.recognize(imagePath);
    await this.ocrWorker.terminate();
    return data.text;
  }

  /**
   * Analiza un documento con IA para generar un resumen.
   * @param documentText Texto del documento
   * @returns Resumen del documento
   */
  public async analyzeDocument(documentText: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Resume el siguiente documento de manera concisa y clara.',
        },
        { role: 'user', content: documentText },
      ],
    });

    return response.choices[0].message.content;
  }
}
