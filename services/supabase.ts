
import { createClient } from '@supabase/supabase-js';
import { Product, Transaction } from '../types';

let supabase: any = null;
let currentUrl: string = '';
let currentKey: string = '';

export const initSupabase = (url: string, key: string) => {
  // 1. URL Düzeltme (HTTPS ekle)
  let safeUrl = url.trim();
  if (!safeUrl.startsWith('http')) {
    safeUrl = `https://${safeUrl}`;
  }
  
  const safeKey = key.trim();

  // 2. Singleton Reset (Eğer ayarlar değiştiyse client'ı yenile)
  if (!supabase || currentUrl !== safeUrl || currentKey !== safeKey) {
    try {
      supabase = createClient(safeUrl, safeKey);
      currentUrl = safeUrl;
      currentKey = safeKey;
      console.log("Supabase connection refreshed");
    } catch (e) {
      console.error("Supabase init error:", e);
      return null;
    }
  }
  return supabase;
};

// FULL SYNC: Fetches all data from Supabase
export const loadFromSupabase = async (url: string, key: string): Promise<{ success: boolean; data?: { products: Product[], transactions: Transaction[] }; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı (URL formatını kontrol edin).' };

    // Bağlantı testi için basit bir select
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
        message: 'Veriler başarıyla indirildi.' 
    };

  } catch (error: any) {
    console.error("Supabase Load Error:", error);
    let msg = error.message || 'Bilinmeyen hata';
    
    // Kullanıcı dostu hata mesajları
    if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
        msg = 'Sunucuya ulaşılamadı. Project URL yanlış olabilir veya internet bağlantınız yok.';
    } else if (msg.includes('Invalid API key')) {
        msg = 'API Key geçersiz.';
    }

    return { success: false, message: 'Bağlantı hatası: ' + msg };
  }
};

// UPSERT: Merges local data with cloud data
export const saveToSupabase = async (url: string, key: string, products: Product[], transactions: Transaction[]): Promise<{ success: boolean; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı.' };

    // 1. Upsert Products
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
    let msg = error.message || 'Bilinmeyen hata';
    
    if (msg.includes('Failed to fetch')) {
        msg = 'Sunucuya ulaşılamadı. URL kontrolü yapın.';
    }

    return { success: false, message: 'Kaydetme hatası: ' + msg };
  }
};
