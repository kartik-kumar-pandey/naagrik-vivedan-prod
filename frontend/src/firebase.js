// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const env = import.meta.env || {};
const getEnvValue = (viteKey, legacyKey) => env[viteKey] || env[legacyKey];

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  databaseURL: getEnvValue('VITE_FIREBASE_DATABASE_URL', 'REACT_APP_FIREBASE_DATABASE_URL'),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID')
};

// Validate Firebase config
const isFirebaseConfigured = firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.databaseURL && 
  firebaseConfig.projectId;

if (!isFirebaseConfigured) {
  console.error('Firebase configuration is missing! Please set environment variables:');
  console.error('VITE_FIREBASE_API_KEY (or legacy REACT_APP_FIREBASE_API_KEY)');
  console.error('VITE_FIREBASE_AUTH_DOMAIN (or legacy REACT_APP_FIREBASE_AUTH_DOMAIN)');
  console.error('VITE_FIREBASE_DATABASE_URL (or legacy REACT_APP_FIREBASE_DATABASE_URL)');
  console.error('VITE_FIREBASE_PROJECT_ID (or legacy REACT_APP_FIREBASE_PROJECT_ID)');
  console.error('VITE_FIREBASE_STORAGE_BUCKET (or legacy REACT_APP_FIREBASE_STORAGE_BUCKET)');
  console.error('VITE_FIREBASE_MESSAGING_SENDER_ID (or legacy REACT_APP_FIREBASE_MESSAGING_SENDER_ID)');
  console.error('VITE_FIREBASE_APP_ID (or legacy REACT_APP_FIREBASE_APP_ID)');
}

// Initialize Firebase
let app;
let auth;
let database;

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    database = getDatabase(app);
    console.log('[Firebase] Initialized successfully');
  } else {
    console.warn('[Firebase] Using mock Firebase (environment variables not set)');
    // Create mock objects to prevent crashes
    app = null;
    auth = null;
    database = null;
  }
} catch (error) {
  console.error('[Firebase] Initialization error:', error);
  app = null;
  auth = null;
  database = null;
}

export { auth, database };
export default app;


