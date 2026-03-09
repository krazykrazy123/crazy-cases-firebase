import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const useTelegramUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setLoading(false);
      return;
    }

    tg.ready();
    tg.expand();

    const init = () => {
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser?.id) {
        const uid = tgUser.id.toString();

        // Save / update in Firestore (exactly like we planned)
        setDoc(doc(db, "users", uid), {
          telegramId: uid,
          username: tgUser.username || tgUser.first_name || "player",
          stars_balance: 50,
          balanceTON: 0,
          current_game_id: null,
          lastLogin: new Date()
        }, { merge: true });

        setUser({ ...tgUser, uid });
        setLoading(false);
      }
    };

    // Try immediately + retry every 300ms (max 20 attempts)
    init();
    const interval = setInterval(() => {
      if (!user) init();
      else clearInterval(interval);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return { user, loading };
};