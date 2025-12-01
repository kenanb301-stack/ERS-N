import { createClient } from '@supabase/supabase-js';
import { Product, Transaction, Order } from '../types';

let supabase: any = null;
let currentUrl: string = '';
let currentKey: string = '';

export const initSupabase = (url: string, key: string) => {
  let safeUrl = url.trim();
  if (safeUrl.endsWith('/')) safeUrl = safeUrl.slice(0, -1);
  if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
  const safeKey = key.trim();

  if (!supabase || currentUrl !== safeUrl || currentKey !== safeKey) {
    try {
      if (!safeUrl || !safeKey) return null;
      supabase = createClient(safeUrl, safeKey, { auth: { persistSession: false, autoRefreshToken: false } });
      currentUrl = safeUrl;
      currentKey = safeKey;
    } catch (e) { return null; }
  }
  return supabase;
};

const fetchAllData = async (client: any, table: string) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await client.from(table).select('*').range(from, from + step - 1);
        if (error) throw error;
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
        } else { hasMore = false; }
    }
    return allData;
};

const saveInBatches = async (client: any, table: string, data: any[]) => {
    const BATCH_SIZE = 500;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const { error } = await client.from(table).upsert(batch, { onConflict: 'id' });
        if (error) throw error;
    }
};

export const testConnection = async (url: string, key: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: "URL/Key eksik." };
        const { error } = await client.from('products').select('*', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') return { success: false, message: "Tablo yok. SQL çalıştırın." };
            if (error.code === '42501') return { success: false, message: "Yetki yok. SQL'deki RLS kodunu çalıştırın." };
            throw error;
        }
        return { success: true, message: "Bağlantı Başarılı!" };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const loadFromSupabase = async (url: string, key: string) => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Client error' };
    
    const products = await fetchAllData(client, 'products');
    const transactions = await fetchAllData(client, 'transactions');
    
    let orders: Order[] = [];
    try {
        orders = await fetchAllData(client, 'orders');
    } catch (e) { console.warn("Orders table might be missing"); }

    return { success: true, data: { products, transactions, orders }, message: 'OK' };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const saveToSupabase = async (url: string, key: string, products: Product[], transactions: Transaction[], orders?: Order[]) => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Client error' };

    if (products.length > 0) await saveInBatches(client, 'products', products);
    if (transactions.length > 0) await saveInBatches(client, 'transactions', transactions);
    if (orders && orders.length > 0) await saveInBatches(client, 'orders', orders);

    return { success: true, message: 'Saved' };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const clearDatabase = async (url: string, key: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Client error' };
        await client.from('transactions').delete().neq('id', '0');
        await client.from('products').delete().neq('id', '0');
        await client.from('orders').delete().neq('id', '0');
        return { success: true, message: 'Cleared' };
    } catch (e: any) { return { success: false, message: e.message }; }
};