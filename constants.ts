import { Product, Transaction, TransactionType } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    product_name: 'A4 Fotokopi Kağıdı',
    category: 'Kırtasiye',
    min_stock_level: 50,
    unit: 'Paket',
    current_stock: 120,
    barcode: '869000000001',
    created_at: '2023-10-01',
  },
  {
    id: 'p-2',
    product_name: 'Endüstriyel Temizlik Sıvısı',
    category: 'Temizlik',
    min_stock_level: 20,
    unit: 'Bidon (5L)',
    current_stock: 15, // Critical
    barcode: '869000000002',
    created_at: '2023-10-05',
  },
  {
    id: 'p-3',
    product_name: 'Laptop Standı',
    category: 'Ofis Malzemeleri',
    min_stock_level: 10,
    unit: 'Adet',
    current_stock: 45,
    barcode: '869000000003',
    created_at: '2023-11-12',
  },
  {
    id: 'p-4',
    product_name: 'USB-C Kablo',
    category: 'Elektronik',
    min_stock_level: 100,
    unit: 'Adet',
    current_stock: 80, // Critical
    barcode: '869000000004',
    created_at: '2023-11-15',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    product_id: 'p-1',
    product_name: 'A4 Fotokopi Kağıdı',
    type: TransactionType.IN,
    quantity: 100,
    date: '2023-12-01T09:00:00.000Z',
    description: 'Toptancıdan gelen mal',
    created_by: 'Ahmet Yılmaz',
    previous_stock: 20,
    new_stock: 120
  },
  {
    id: 't-2',
    product_id: 'p-2',
    product_name: 'Endüstriyel Temizlik Sıvısı',
    type: TransactionType.OUT,
    quantity: 5,
    date: '2023-12-02T14:30:00.000Z',
    description: 'Kat 3 temizliği için',
    created_by: 'Ayşe Demir',
    previous_stock: 20,
    new_stock: 15
  },
];

export const UNITS = ['Adet', 'Paket', 'Koli', 'Kg', 'Litre', 'Metre', 'Rulo'];
export const CATEGORIES = ['Genel', 'Kırtasiye', 'Elektronik', 'Temizlik', 'Hırdavat', 'Mobilya'];