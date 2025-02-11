import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

interface ValidationResult {
  name: string;
  isValid: boolean;
  errors: string[];
  validatedAt: Date;
}

export default class DocumentValidationService {
  private static instance: DocumentValidationService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  public static getInstance(): DocumentValidationService {
    if (!this.instance) {
      this.instance = new DocumentValidationService();
    }
    return this.instance;
  }

  /**
   * Valida el contenido de un documento en función de reglas predefinidas.
   * @param filePath Ruta del archivo.
   * @returns Resultado de la validación.
   */
  public async validateDocument(filePath: string): Promise<ValidationResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe.`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Revisa el siguiente documento en busca de errores estructurales, datos faltantes o inconsistencias.',
        },
        { role: 'user', content: content },
      ],
    });

    const validationFeedback = response.choices[0].message.content.split('\n');
    const isValid =
      validationFeedback.length === 1 &&
      validationFeedback[0].toLowerCase().includes('no errores detectados');

    return {
      name: path.basename(filePath),
      isValid,
      errors: isValid ? [] : validationFeedback,
      validatedAt: new Date(),
    };
  }
}
