import { useState, useEffect } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface TelegramUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

export function useTelegramAuth() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setError('Not running inside Telegram Mini App');
      setLoading(false);
      return;
    }

    tg.ready();

    const initData = tg.initData;
    if (!initData) {
      setError('No initData from Telegram');
      setLoading(false);
      return;
    }

    console.log('Calling Cloud Function with initData...');

    const validate = httpsCallable(functions, 'validateTelegramInitData');

    validate({ initData })
      .then((result) => {
        const data = result.data as any;
        if (data.success) {
          const auth = getAuth();
          signInWithCustomToken(auth, data.customToken)
            .then(() => {
              console.log('✅ Signed in successfully! UID:', data.telegramUser.id);
              setUser(data.telegramUser);
            })
            .catch((err) => setError('Sign-in failed: ' + err.message));
        } else {
          setError('Validation failed');
        }
      })
      .catch((err) => {
        console.error('Cloud Function error:', err);
        setError('Failed to connect to server: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, error };
}