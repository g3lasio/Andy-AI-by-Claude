
export interface TaxYear {
  year: number;
  documents: Document[];
  status: 'COMPLETE' | 'INCOMPLETE' | 'PENDING';
  lastUpdated: Date;
}

export interface IRSRequirement {
  formId: string;
  description: string;
  deadline: string;
  required?: boolean;
  alternatives?: string[];
}

export interface DocumentationType {
  type: 'W2' | '1099' | 'RECEIPT' | 'STATEMENT' | 'LETTER';
  year: number;
  source: string;
  validUntil?: Date;
}
