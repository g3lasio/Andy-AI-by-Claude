import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';

interface FetchedDocument {
  name: string;
  type: string;
  size: number;
  content: Uint8Array | string;
  source: 'local' | 'web';
  processedAt: Date;
}

export default class DocumentFetchService {
  private static instance: DocumentFetchService;
  private openai: OpenAI;
  private ocrWorker: any;

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.ocrWorker = createWorker();
  }

  public static getInstance(): DocumentFetchService {
    if (!this.instance) {
      this.instance = new DocumentFetchService();
    }
    return this.instance;
  }

  /**
   * Busca un documento en la base de datos local.
   * @param documentName Nombre del documento a buscar.
   * @returns Documento si se encuentra, null si no.
   */
  public async findInLocalDatabase(documentName: string): Promise<FetchedDocument | null> {
    const filePath = path.join(__dirname, '../../storage/forms', documentName);
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return {
        name: documentName,
        type: path.extname(filePath),
        size: fileBuffer.length,
        content: fileBuffer,
        source: 'local',
        processedAt: new Date(),
      };
    }
    return null;
  }

  /**
   * Busca un documento en la web si no está en la base de datos local.
   * @param documentName Nombre del documento a buscar.
   * @returns URL del documento si se encuentra.
   */
  public async findOnline(documentName: string): Promise<string | null> {
    const query = `Descarga oficial de ${documentName} site:.gov OR site:.org`;
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Busca el enlace de descarga oficial para este documento.' },
        { role: 'user', content: query },
      ],
    });
    return response.choices[0]?.message.content || null;
  }

  /**
   * Descarga un documento desde la web.
   * @param url URL del documento a descargar.
   * @returns Datos del documento descargado.
   */
  public async downloadFromWeb(url: string, documentName: string): Promise<FetchedDocument> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      name: documentName,
      type: path.extname(documentName),
      size: response.data.length,
      content: response.data,
      source: 'web',
      processedAt: new Date(),
    };
  }

  /**
   * Valida si un documento personalizado tiene toda la información correcta.
   * @param filePath Ruta del archivo.
   * @returns Resultado de validación.
   */
  public async validateCustomDocument(filePath: string): Promise<boolean> {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    return pdfDoc.getPageCount() > 0; // Simple validación
  }

  /**
   * Procesa una imagen de un documento utilizando OCR.
   * @param filePath Ruta de la imagen del documento.
   * @returns Texto extraído de la imagen.
   */
  public async processImage(filePath: string): Promise<string> {
    await this.ocrWorker.load();
    await this.ocrWorker.loadLanguage('eng');
    await this.ocrWorker.initialize('eng');
    const { data } = await this.ocrWorker.recognize(filePath);
    await this.ocrWorker.terminate();
    return data.text;
  }
}
