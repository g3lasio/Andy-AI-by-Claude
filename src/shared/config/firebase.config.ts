
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Singleton pattern para Firebase
class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp;

  private constructor() {
    this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  public getApp(): FirebaseApp {
    return this.app;
  }

  public getStorage() {
    return getStorage(this.app);
  }

  public getFirestore() {
    return getFirestore(this.app);
  }
}

export const firebaseService = FirebaseService.getInstance();
export const firebaseApp = firebaseService.getApp();
export const storage = firebaseService.getStorage();
export const db = firebaseService.getFirestore();
