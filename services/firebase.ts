
// @ts-ignore
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
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

let app: any;
let db: any;

export const initializeFirebase = (config: FirebaseConfig): any => {
  try {
    // Eğer hali hazırda bir app varsa ve config değiştiyse sil
    if (getApps().length > 0) {
       getApps().forEach((a: any) => deleteApp(a));
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
