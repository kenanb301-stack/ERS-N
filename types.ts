export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export interface Product {
  id: string;
  product_name: string;
  category: string;
  min_stock_level: number;
  unit: string;
  current_stock: number;
  barcode?: string; // Bu alan artık QR kod içeriğini tutar
  image_url?: string; // Yeni görsel alanı
  created_at?: string;
}

export interface Transaction {
  id: string;
  product_id: string;
  product_name?: string; // Denormalized for easier display
  type: TransactionType;
  quantity: number;
  date: string;
  description: string;
  created_by: string;
  previous_stock?: number;
  new_stock?: number;
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'HISTORY' | 'NEGATIVE_STOCK';

export interface TransactionFormData {
  productId: string;
  type: TransactionType;
  quantity: number;
  description: string;
}