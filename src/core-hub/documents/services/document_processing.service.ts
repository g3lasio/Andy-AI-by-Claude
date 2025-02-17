import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

interface ProcessedDocument {
  text: string;
  metadata: {
    name: string;
    type: string;
    size: number;
    processedAt: Date;
  };
}

export default class DocumentProcessingService {
  private static instance: DocumentProcessingService;
  private openai: OpenAI;
  private ocrWorker: any;

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.ocrWorker = createWorker();
  }

  public static getInstance(): DocumentProcessingService {
    if (!this.instance) {
      this.instance = new DocumentProcessingService();
    }
    return this.instance;
  }

  /**
   * Detecta el tipo de archivo y procesa adecuadamente
   * @param filePath Ruta del archivo
   * @returns Documento procesado con metadatos
   */
  public async processFile(filePath: string): Promise<ProcessedDocument> {
    const extension = path.extname(filePath).toLowerCase();
    switch (extension) {
      case '.pdf':
        return this.processPDF(filePath);
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.bmp':
      case '.tiff':
        return this.processImage(filePath);
      case '.csv':
        return this.processCSV(filePath);
      case '.xlsx':
        return this.processExcel(filePath);
      case '.txt':
      case '.md':
        return this.processText(filePath);
      default:
        throw new Error(`Formato de archivo no soportado: ${extension}`);
    }
  }

  /**
   * Procesa documentos PDF y extrae el texto.
   */
  public async processPDF(filePath: string): Promise<ProcessedDocument> {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const text = pdfDoc.getText();
    return this.generateProcessedDocument(filePath, 'pdf', text);
  }

  /**
   * Procesa imágenes y extrae texto usando OCR.
   */
  public async processImage(filePath: string): Promise<ProcessedDocument> {
    await this.ocrWorker.load();
    await this.ocrWorker.loadLanguage('eng');
    await this.ocrWorker.initialize('eng');
    const { data } = await this.ocrWorker.recognize(filePath);
    await this.ocrWorker.terminate();
    return this.generateProcessedDocument(filePath, 'image', data.text);
  }

  /**
   * Procesa archivos CSV y convierte su contenido a texto.
   */
  public async processCSV(filePath: string): Promise<ProcessedDocument> {
    return new Promise((resolve, reject) => {
      let text = '';
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          text += JSON.stringify(row) + '\n';
        })
        .on('end', () => {
          resolve(this.generateProcessedDocument(filePath, 'csv', text));
        })
        .on('error', reject);
    });
  }

  /**
   * Procesa archivos Excel y extrae contenido en texto estructurado.
   */
  public async processExcel(filePath: string): Promise<ProcessedDocument> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const text = XLSX.utils.sheet_to_csv(sheet);
    return this.generateProcessedDocument(filePath, 'xlsx', text);
  }

  /**
   * Procesa archivos de texto plano.
   */
  public async processText(filePath: string): Promise<ProcessedDocument> {
    const text = fs.readFileSync(filePath, 'utf-8');
    return this.generateProcessedDocument(filePath, 'text', text);
  }

  /**
   * Utiliza IA para extraer información clave del texto procesado.
   */
  public async analyzeDocument(documentText: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extrae información clave del siguiente documento.',
        },
        { role: 'user', content: documentText },
      ],
    });
    return response.choices[0].message.content;
  }

  /**
   * Genera un objeto con metadatos del documento procesado.
   */
  private generateProcessedDocument(
    filePath: string,
    type: string,
    text: string
  ): ProcessedDocument {
    return {
      text,
      metadata: {
        name: path.basename(filePath),
        type,
        size: fs.statSync(filePath).size,
        processedAt: new Date(),
      },
    };
  }
}


  public async extractStructuredData(content: string): Promise<any> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Extrae todos los datos estructurados de este documento, incluyendo:
        - Fechas y timestamps
        - Cantidades monetarias
        - Nombres y entidades
        - Datos numéricos
        - Referencias o IDs
        
        Documento:
        ${content}`
      }]
    });
    
    return JSON.parse(response.content[0].text);
  }

  public async suggestModifications(content: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Analiza este documento y sugiere mejoras potenciales en:
        - Formato y estructura
        - Claridad del lenguaje
        - Completitud de información
        - Cumplimiento normativo
        
        Documento:
        ${content}`
      }]
    });
    
    return response.content[0].text;
  }

  public async validateCompliance(content: string, documentType: string): Promise<boolean> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Verifica si este ${documentType} cumple con todos los requisitos legales y regulatorios necesarios.
        
        Documento:
        ${content}`
      }]
    });
    
    return response.content[0].text.toLowerCase().includes('cumple con todos los requisitos');
  }
