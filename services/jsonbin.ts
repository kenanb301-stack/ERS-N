
import { Product, Transaction } from '../types';

interface SyncData {
  products: Product[];
  transactions: Transaction[];
  lastUpdated: string;
}

export const createBin = async (apiKey: string, data: SyncData): Promise<{ success: boolean; binId?: string; message: string }> => {
  try {
    const response = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Name': 'DepoPro_DB',
        'X-Bin-Private': 'true'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
        if (response.status === 401) {
            return { success: false, message: 'API Key geçersiz.' };
        }
        return { success: false, message: `Oluşturma Hatası: ${response.statusText}` };
    }

    const result = await response.json();
    return { success: true, binId: result.metadata.id, message: 'Bin başarıyla oluşturuldu.' };

  } catch (error) {
    console.error("Cloud Create Error:", error);
    return { success: false, message: 'Bağlantı hatası.' };
  }
};

export const saveToCloud = async (apiKey: string, binId: string, data: SyncData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false' // Tarihçe tutmayı kapatarak alan tasarrufu yapıyoruz
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            return { success: false, message: 'Yetkisiz Erişim: API Key veya Bin ID hatalı.' };
        }
        if (response.status === 404) {
            return { success: false, message: 'Bin ID bulunamadı (Silinmiş olabilir).' };
        }
        return { success: false, message: `Hata: ${response.statusText}` };
    }

    return { success: true, message: 'Veriler JSONBin bulutuna kaydedildi.' };
  } catch (error) {
    console.error("Cloud Save Error:", error);
    return { success: false, message: 'Bulut bağlantı hatası (Ağ sorunu).' };
  }
};

export const loadFromCloud = async (apiKey: string, binId: string): Promise<{ success: boolean; data?: SyncData; message: string }> => {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': apiKey
      }
    });

    if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
            return { success: false, message: 'Yetkisiz Erişim: API Key veya Bin ID hatalı.' };
        }
        if (response.status === 404) {
            return { success: false, message: 'Bin ID bulunamadı.' };
        }
        return { success: false, message: `Hata: ${response.statusText}` };
    }

    const result = await response.json();
    
    // JSONBin v3 veriyi 'record' objesi içinde döner
    if (result.record) {
        // Eğer bin boşsa veya yanlış formatta ise kontrol et
        if (!result.record.products && !result.record.transactions) {
             return { success: false, message: 'Bulut deposu boş veya geçersiz format.' };
        }
        return { success: true, data: result.record, message: 'Veriler indirildi.' };
    } else {
        return { success: false, message: 'Veri yapısı geçersiz.' };
    }

  } catch (error) {
    console.error("Cloud Load Error:", error);
    return { success: false, message: 'Bulut bağlantı hatası (Ağ sorunu).' };
  }
};
