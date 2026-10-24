import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { firebaseApp, firebaseConfig } from './firebase';

export type Account =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; uid: string; name: string; db: Firestore };

const config = firebaseConfig();

/** Connexion Google à Firebase. Sans configuration, le compte reste désactivé et l'app travaille en local. */
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

  const signIn = async () => {
    if (!config) return;
    const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
    const auth = getAuth(await firebaseApp(config));
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      // Fenêtre bloquée (mobile, navigateur strict) : on passe par une redirection.
      if ((e as { code?: string }).code === 'auth/popup-blocked') await signInWithRedirect(auth, provider);
      else throw e;
    }
  };

  const signOut = async () => {
    if (!config) return;
    const { getAuth, signOut } = await import('firebase/auth');
    await signOut(getAuth(await firebaseApp(config)));
  };

  return { account, signIn, signOut };
}
