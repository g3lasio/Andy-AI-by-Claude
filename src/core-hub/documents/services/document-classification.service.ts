import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

interface ClassifiedDocument {
  name: string;
  type: string;
  confidence: number;
  classifiedAt: Date;
}

export default class DocumentClassificationService {
  private static instance: DocumentClassificationService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  public static getInstance(): DocumentClassificationService {
    if (!this.instance) {
      this.instance = new DocumentClassificationService();
    }
    return this.instance;
  }

  /**
   * Clasifica un documento basado en su contenido.
   * @param filePath Ruta del archivo.
   * @returns Tipo de documento y nivel de confianza.
   */
  public async classifyDocument(filePath: string): Promise<ClassifiedDocument> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe.`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `Analiza y clasifica el siguiente documento. Proporciona:
          1. Tipo de documento (Factura, Contrato, Reporte, etc.)
          2. Propósito principal
          3. Nivel de confidencialidad estimado (Bajo/Medio/Alto)
          4. Campos clave identificados`,
        },
        { role: 'user', content: content },
      ],
    });

    const classification = response.choices[0].message.content;

    return {
      name: path.basename(filePath),
      type: classification,
      confidence: 0.95, // Se puede mejorar con más entrenamiento
      classifiedAt: new Date(),
    };
  }
}
