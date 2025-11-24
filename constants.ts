
import { Product, Transaction, TransactionType } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    product_name: 'BASKI LAMASI',
    part_code: 'P-00003',
    location: 'B1-06-06',
    material: 'ST37 SOĞUK ÇEKME',
    category: 'Yedek Parça',
    min_stock_level: 5,
    unit: 'Adet',
    current_stock: 3, // Kritik seviye altı (Örnekteki miktar)
    barcode: 'P-00003',
    image_url: 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&q=80&w=200',
    created_at: '2023-10-01',
  },
  {
    id: 'p-2',
    product_name: 'HİDROLİK PİSTON MİLİ',
    part_code: 'H-20402',
    location: 'A2-12-01',
    material: 'CK45 KROM KAPLI',
    category: 'Hidrolik',
    min_stock_level: 2,
    unit: 'Adet',
    current_stock: 8,
    barcode: 'H-20402',
    image_url: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?auto=format&fit=crop&q=80&w=200',
    created_at: '2023-10-05',
  },
  {
    id: 'p-3',
    product_name: 'CIVATA M12x40',
    part_code: 'C-1240-88',
    location: 'K4-01-05',
    material: '8.8 ÇELİK',
    category: 'Hırdavat',
    min_stock_level: 100,
    unit: 'Adet',
    current_stock: 450,
    barcode: 'C-1240-88',
    image_url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&q=80&w=200',
    created_at: '2023-11-12',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    product_id: 'p-1',
    product_name: 'BASKI LAMASI',
    type: TransactionType.IN,
    quantity: 10,
    date: '2023-12-01T09:00:00.000Z',
    description: 'İmalattan giriş',
    created_by: 'Ahmet Usta',
    previous_stock: 0,
    new_stock: 10
  },
  {
    id: 't-2',
    product_id: 'p-1',
    product_name: 'BASKI LAMASI',
    type: TransactionType.OUT,
    quantity: 7,
    date: '2023-12-02T14:30:00.000Z',
    description: 'Montaj hattına sevk',
    created_by: 'Mehmet Şef',
    previous_stock: 10,
    new_stock: 3
  },
];

export const UNITS = ['Adet', 'Metre', 'Kg', 'Litre', 'Takım', 'Paket'];
export const CATEGORIES = ['Yedek Parça', 'Hırdavat', 'Hammadde', 'Hidrolik', 'Elektrik', 'Sarf Malzeme'];
