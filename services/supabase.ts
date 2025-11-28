import { createClient } from '@supabase/supabase-js';
import { Product, Transaction } from '../types';

let supabase: any = null;
let currentUrl: string = '';
let currentKey: string = '';

export const initSupabase = (url: string, key: string) => {
  // 1. URL Düzeltme (HTTPS ekle)
  let safeUrl = url.trim();
  // Sondaki slash işaretini kaldır
  if (safeUrl.endsWith('/')) {
    safeUrl = safeUrl.slice(0, -1);
  }
  
  if (!safeUrl.startsWith('http')) {
    safeUrl = `https://${safeUrl}`;
  }
  
  const safeKey = key.trim();

  // 2. Singleton Reset (Eğer ayarlar değiştiyse client'ı yenile)
  if (!supabase || currentUrl !== safeUrl || currentKey !== safeKey) {
    try {
      if (!safeUrl || !safeKey) return null;
      
      supabase = createClient(safeUrl, safeKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
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

// --- YARDIMCI FONKSİYONLAR ---

// 1. Pagination Loop: 1000 satır limitini aşmak için veriyi parça parça çeker
const fetchAllData = async (client: any, table: string) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000; // Supabase default max limit
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await client
            .from(table)
            .select('*')
            .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            // Eğer gelen veri paketi step'ten küçükse, verinin sonuna gelinmiştir
            if (data.length < step) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }
    return allData;
};

// 2. Batch Saving: Büyük verileri 500'erli paketler halinde kaydeder (Timeout önlemek için)
const saveInBatches = async (client: any, table: string, data: any[]) => {
    const BATCH_SIZE = 500;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const { error } = await client
            .from(table)
            .upsert(batch, { onConflict: 'id' });
        
        if (error) throw error;
    }
};

// TEST CONNECTION
export const testConnection = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: "URL veya API Key eksik." };

        // Hafif bir sorgu ile bağlantı ve yetki testi
        const { error } = await client
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error("Test Error:", error);
            if (error.code === '42P01') return { success: false, message: "Tablolar bulunamadı. Lütfen SQL kodunu çalıştırın." };
            if (error.code === '42501') return { success: false, message: "Erişim Reddedildi. SQL kodundaki 'DISABLE RLS' satırlarını çalıştırın." };
            throw error;
        }

        return { success: true, message: "Bağlantı Başarılı! Veritabanı hazır." };
    } catch (error: any) {
        let msg = error.message || 'Bilinmeyen hata';
        if (msg.includes('Failed to fetch')) msg = 'Sunucuya ulaşılamadı. Project URL yanlış.';
        if (msg.includes('Invalid API key')) msg = 'API Key geçersiz.';
        return { success: false, message: msg };
    }
};

// FULL SYNC: Fetches ALL data from Supabase using pagination
export const loadFromSupabase = async (url: string, key: string): Promise<{ success: boolean; data?: { products: Product[], transactions: Transaction[] }; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı (URL formatını kontrol edin).' };

    // Tüm ürünleri çek (Pagination ile)
    const products = await fetchAllData(client, 'products');

    // Tüm işlemleri çek (Pagination ile)
    const transactions = await fetchAllData(client, 'transactions');

    return { 
        success: true, 
        data: { 
            products: products || [], 
            transactions: transactions || [] 
        }, 
        message: `Veriler indirildi. (${products.length} ürün, ${transactions.length} işlem)` 
    };

  } catch (error: any) {
    console.error("Supabase Load Error:", error);
    let msg = error.message || 'Bilinmeyen hata';
    
    if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
        msg = 'Sunucuya ulaşılamadı. Project URL yanlış olabilir veya internet bağlantınız yok.';
    } else if (msg.includes('Invalid API key')) {
        msg = 'API Key geçersiz.';
    }

    return { success: false, message: 'Bağlantı hatası: ' + msg };
  }
};

// UPSERT: Saves data in batches
export const saveToSupabase = async (url: string, key: string, products: Product[], transactions: Transaction[]): Promise<{ success: boolean; message: string }> => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı.' };

    // 1. Upsert Products (Batching)
    if (products.length > 0) {
        await saveInBatches(client, 'products', products);
    }

    // 2. Upsert Transactions (Batching)
    if (transactions.length > 0) {
        await saveInBatches(client, 'transactions', transactions);
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

// DELETE ALL: Clears all data in tables
export const clearDatabase = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Supabase istemcisi başlatılamadı.' };

        // 1. Delete all transactions
        const { error: txError } = await client
            .from('transactions')
            .delete()
            .neq('id', '0'); // Delete everything where id is not '0' (which is everything)

        if (txError) throw txError;

        // 2. Delete all products
        const { error: prError } = await client
            .from('products')
            .delete()
            .neq('id', '0');

        if (prError) throw prError;

        return { success: true, message: 'Bulut veritabanı temizlendi.' };
    } catch (error: any) {
        console.error("Supabase Clear Error:", error);
        return { success: false, message: 'Temizleme hatası: ' + error.message };
    }
};