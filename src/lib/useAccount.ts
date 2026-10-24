import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { firebaseApp, firebaseConfig } from './firebase';

export type Account =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; uid: string; name: string; db: Firestore };

const config = firebaseConfig();

/** Connexion à Firebase par email et mot de passe. Sans configuration, le compte reste désactivé et l'app travaille en local. */
export function useAccount() {
  const [account, setAccount] = useState<Account>(config ? { status: 'loading' } : { status: 'disabled' });

  useEffect(() => {
    if (!config) return;
    let unsubscribe = () => {};
    let cancelled = false;
    void (async () => {
      const app = await firebaseApp(config);
      const [{ getAuth, onAuthStateChanged }, { initializeFirestore, persistentLocalCache }] = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      // Cache local : les images enregistrées restent consultables hors ligne.
      const db = initializeFirestore(app, { localCache: persistentLocalCache(), ignoreUndefinedProperties: true });
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(getAuth(app), (user) =>
        setAccount(
          user
            ? { status: 'signedIn', uid: user.uid, name: user.displayName ?? user.email ?? '', db }
            : { status: 'signedOut' },
        ),
      );
    })().catch((e) => {
      console.error('Firebase indisponible', e);
      setAccount({ status: 'disabled' });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!config) return;
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(getAuth(await firebaseApp(config)), email.trim(), password);
  };

  const resetPassword = async (email: string) => {
    if (!config) return;
    const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(getAuth(await firebaseApp(config)), email.trim());
  };

  const signOut = async () => {
    if (!config) return;
    const { getAuth, signOut } = await import('firebase/auth');
    await signOut(getAuth(await firebaseApp(config)));
  };

  return { account, signIn, resetPassword, signOut };
}
