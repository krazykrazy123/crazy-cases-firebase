import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const useUserBalance = (telegramId) => {
  const [balanceTON, setBalanceTON] = useState(0);
  const [balanceSTARS, setBalanceSTARS] = useState(0);

  useEffect(() => {
    if (!telegramId) return;

    const userRef = doc(db, "users", telegramId.toString());

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setBalanceTON(snap.data().balanceTON || 0);
        setBalanceSTARS(snap.data().balanceSTARS || 0);
      } else {
        // First time user - init with 0
        setBalanceTON(0);
        setBalanceSTARS(0);
      }
    });

    return () => unsubscribe();
  }, [telegramId]);

  return { balanceTON, balanceSTARS };
};