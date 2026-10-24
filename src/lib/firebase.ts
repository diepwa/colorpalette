import type { FirebaseApp, FirebaseOptions } from 'firebase/app';

/** Configuration web Firebase lue dans .env.local ; null si elle est absente (stockage local seulement). */
export function firebaseConfig(env: ImportMetaEnv = import.meta.env): FirebaseOptions | null {
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID } = env;
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_PROJECT_ID || !VITE_FIREBASE_APP_ID) return null;
  return {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN || `${VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: VITE_FIREBASE_APP_ID,
  };
}

let app: Promise<FirebaseApp> | null = null;

/** Application Firebase, chargée à la demande pour ne pas alourdir l'app quand Firebase n'est pas configuré. */
export function firebaseApp(config: FirebaseOptions): Promise<FirebaseApp> {
  app ??= import('firebase/app').then(({ initializeApp }) => initializeApp(config));
  return app;
}
