import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { FormType } from '../interfaces/form.types';

// Configuración de OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Servicio para gestionar formularios
export default {
  /**
   * Carga un formulario PDF desde el sistema de archivos.
   * @param filePath Ruta del archivo PDF.
   * @returns Instancia del PDF cargado.
   * @throws {Error} Si el archivo no existe o no es un PDF válido.
   */
  async loadForm(filePath: string): Promise<PDFDocument> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo ${filePath} no existe.`);
      }

      const fileBuffer = await fs.promises.readFile(filePath); // Usar fs.promises para async/await
      return await PDFDocument.load(fileBuffer);
    } catch (error) {
      console.error('Error al cargar el formulario:', error);
      throw new Error('No se pudo cargar el formulario.');
    }
  },

  /**
   * Extrae los campos de un formulario PDF.
   * @param pdfDocument Documento PDF cargado.
   * @returns Lista de campos del formulario.
   * @throws {Error} Si el documento no es válido o no tiene campos.
   */
  async extractFormFields(pdfDocument: PDFDocument): Promise<string[]> {
    try {
      if (!pdfDocument || typeof pdfDocument !== 'object') {
        throw new Error('El documento PDF no es válido.');
      }

      const form = pdfDocument.getForm();
      const fields = form.getFields().map((field) => field.getName());

      if (fields.length === 0) {
        console.warn('El formulario no tiene campos editables.');
      }

      return fields;
    } catch (error) {
      console.error('Error al extraer los campos del formulario:', error);
      throw new Error('No se pudieron extraer los campos del formulario.');
    }
  },

  /**
   * Completa un formulario PDF con datos proporcionados.
   * @param pdfDocument Documento PDF cargado.
   * @param formData Datos a completar en el formulario (clave: nombre del campo, valor: texto a insertar).
   * @returns Buffer del PDF con los datos insertados.
   * @throws {Error} Si el documento no es válido o los datos no son válidos.
   */
  async fillForm(
    pdfDocument: PDFDocument,
    formData: Record<string, string>
  ): Promise<Uint8Array> {
    try {
      if (!pdfDocument || typeof pdfDocument !== 'object') {
        throw new Error('El documento PDF no es válido.');
      }
      if (!formData || typeof formData !== 'object') {
        throw new Error('Los datos del formulario no son válidos.');
      }

      const form = pdfDocument.getForm();

      for (const [key, value] of Object.entries(formData)) {
        const field = form.getTextField(key);
        if (field) {
          field.setText(value);
        } else {
          console.warn(`Campo ${key} no encontrado en el formulario.`);
        }
      }

      return await pdfDocument.save();
    } catch (error) {
      console.error('Error al completar el formulario:', error);
      throw new Error('No se pudo completar el formulario.');
    }
  },

  /**
   * Analiza un formulario y su contenido con IA.
   * @param formContent Texto del formulario.
   * @returns Respuesta de la IA con sugerencias o validaciones.
   * @throws {Error} Si no se puede conectar con la IA o el contenido no es válido.
   */
  async analyzeForm(
    formContent: string
  ): Promise<{ suggestions: string[]; errors: string[] }> {
    try {
      if (!formContent || typeof formContent !== 'string') {
        throw new Error('El contenido del formulario no es válido.');
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto en formularios financieros. Analiza el siguiente formulario y devuelve un JSON con dos arrays: "suggestions" (mejoras sugeridas) y "errors" (errores encontrados).',
          },
          { role: 'user', content: formContent },
        ],
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error al analizar el formulario con IA:', error);
      throw new Error('No se pudo analizar el formulario.');
    }
  },

  /**
   * Guarda un formulario PDF en el sistema de archivos.
   * @param filePath Ruta donde guardar el PDF.
   * @param pdfData Datos binarios del PDF.
   * @throws {Error} Si no se puede guardar el archivo.
   */
  saveForm(filePath: string, pdfData: Uint8Array): void {
    try {
      fs.writeFileSync(filePath, pdfData);
      console.log(`Formulario guardado en: ${filePath}`);
    } catch (error) {
      console.error('Error al guardar el formulario:', error);
      throw new Error('No se pudo guardar el formulario.');
    }
  },
};
