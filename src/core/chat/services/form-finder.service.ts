// src/core/chat/services/form-finder.service.ts

export class FormFinderService {
  private static instance: FormFinderService;

  async findForm(query: string): Promise<FormSearchResult[]> {
    try {
      // Buscar en IRS.gov
      const irsSearchUrl = `https://www.irs.gov/forms-pubs/search`;
      const searchResults = await this.searchIRSWebsite(query);

      return searchResults.map((result) => ({
        formId: result.formId,
        name: result.name,
        url: result.url,
        year: result.year,
        category: result.category,
      }));
    } catch (error) {
      logger.error('Error searching forms:', error);
      throw new AppError('FORM_SEARCH_ERROR', 'Error searching for forms');
    }
  }

  async suggestRelatedForms(context: string): Promise<string[]> {
    // Usar Claude para analizar el contexto y sugerir formularios relevantes
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'user',
          content: `Based on this tax situation, what IRS forms would be needed: ${context}`,
        },
      ],
    });

    return this.extractFormSuggestions(response.content[0].text);
  }
}
