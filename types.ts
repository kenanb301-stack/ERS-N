
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export interface Product {
  id: string;
  product_name: string; // "Açıklama" olarak kullanılacak
  part_code?: string;   // Örn: P-00003
  location?: string;    // Örn: B1-06-06 (Reyon)
  material?: string;    // Örn: ST37 SOĞUK ÇEKME (Hammadde)
  min_stock_level: number;
  unit: string;
  current_stock: number;
  barcode?: string; // Barkod içeriği
  created_at?: string;
  critical_since?: string; // Kritik seviyeye düştüğü tarih (ISO String)
  last_alert_sent_at?: string; // Rapor maili gönderildiği tarih (ISO String)
}

export interface Transaction {
  id: string;
  product_id: string;
  product_name?: string;
  type: TransactionType;
  quantity: number;
  date: string;
  description: string;
  created_by: string;
  previous_stock?: number;
  new_stock?: number;
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'HISTORY' | 'NEGATIVE_STOCK' | 'ANALYTICS';

export interface TransactionFormData {
  productId: string;
  type: TransactionType;
  quantity: number;
  description: string;
}

export type UserRole = 'ADMIN' | 'VIEWER';

export interface User {
  username: string;
  name: string;
  role: UserRole;
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseKey: string;
  lastSync?: string;
}