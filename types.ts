
export interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  image?: string; // base64 string
  detailedDescription?: string;
}

export interface QuoteItem {
  productId: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image?: string; // base64 string
  detailedDescription?: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  date: string;
  time?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number; // e.g., 0.05 for 5%
  taxAmount: number;
  freightCost: number;
  total: number;
  companyName?: string;
  tagLine?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyDetails?: string;
  clientCompanyName?: string;
  clientGSTNumber?: string;
  companyLogo?: string;
  warranty?: string;
  paymentTerms?: string;
  termsAndConditions?: string;
  bankDetails?: string;
  revisionCount?: number;
}
