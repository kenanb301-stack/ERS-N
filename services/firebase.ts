
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

// Tip tanımlamaları
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

let app: FirebaseApp | undefined;
let db: Database | undefined;

export const initializeFirebase = (config: FirebaseConfig): Database => {
  try {
    // Eğer hali hazırda bir app varsa ve config değiştiyse sil
    if (getApps().length > 0) {
       getApps().forEach(a => deleteApp(a));
    }

    app = initializeApp(config);
    db = getDatabase(app);
    return db;
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
    throw error;
  }
};

export const getDb = () => db;
