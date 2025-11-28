
import { createClient } from '@supabase/supabase-js';
import { Product, Transaction } from '../types';

let supabase: any = null;

export const initSupabase = (url: string, key: string) => {
  if (!supabase) {
    try {
      supabase = createClient(url, key);
    } catch (e) {
      console.error("Supabase init error:", e);
    }
  }
  return supabase;
};

// FULL SYNC: Fetches all data from Supabase
export const loadFromSupabase = async (url: string, key: string): Promise<{ success: boolean; data?: { products: Product[], transactions: Transaction[] }; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı.' };

    const { data: products, error: productsError } = await client
      .from('products')
      .select('*');

    if (productsError) throw productsError;

    const { data: transactions, error: transactionsError } = await client
      .from('transactions')
      .select('*');

    if (transactionsError) throw transactionsError;

    return { 
        success: true, 
        data: { 
            products: products || [], 
            transactions: transactions || [] 
        }, 
        message: 'Veriler Supabase\'den indirildi.' 
    };

  } catch (error: any) {
    console.error("Supabase Load Error:", error);
    return { success: false, message: 'Bağlantı hatası: ' + (error.message || 'Bilinmeyen hata') };
  }
};

// UPSERT: Merges local data with cloud data
// This avoids "overwriting" other people's data. It only updates/inserts the records we have locally.
export const saveToSupabase = async (url: string, key: string, products: Product[], transactions: Transaction[]): Promise<{ success: boolean; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı.' };

    // 1. Upsert Products
    // Split into chunks if array is huge (Supabase allows bulk upsert, but just to be safe)
    if (products.length > 0) {
        const { error: pError } = await client
        .from('products')
        .upsert(products, { onConflict: 'id' });
        
        if (pError) throw pError;
    }

    // 2. Upsert Transactions
    if (transactions.length > 0) {
        const { error: tError } = await client
        .from('transactions')
        .upsert(transactions, { onConflict: 'id' });

        if (tError) throw tError;
    }

    return { success: true, message: 'Veriler başarıyla eşitlendi.' };

  } catch (error: any) {
    console.error("Supabase Save Error:", error);
    return { success: false, message: 'Kaydetme hatası: ' + (error.message || 'Bilinmeyen hata') };
  }
};
