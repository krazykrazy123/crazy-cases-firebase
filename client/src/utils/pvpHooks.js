import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, increment, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

const CURRENT_ROUND_REF = doc(db, "pvp_rounds", "current_round");

export const usePvpRound = () => {
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time listener
  useEffect(() => {
    const unsubscribe = onSnapshot(CURRENT_ROUND_REF, (docSnap) => {
      if (docSnap.exists()) {
        setRound(docSnap.data());
        console.log("✅ Round loaded:", docSnap.data());
      } else {
        console.log("Document doesn't exist - creating now...");
        initializeRound();
      }
      setLoading(false);
    }, (err) => {
      console.error("Listener error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const initializeRound = async () => {
    try {
      await setDoc(CURRENT_ROUND_REF, {
        status: "betting",
        bets: [],
        potTON: 0,
        potSTARS: 0,
        endTime: null,
        timeLeft: 17,
        finishedAt: null,
        winner: null,
        updatedAt: serverTimestamp()
      });
      console.log("✅ New round document created successfully");
    } catch (err) {
      console.error("Create round failed:", err);
    }
  };

  const placeBet = async (telegramId, username, amount, currency = 'TON') => {
    if (!telegramId || Number(amount) < 0.1) {
      return { success: false, error: "Minimum 0.10 TON/Stars" };
    }

    try {
      // Safety: create if missing
      const roundSnap = await getDoc(CURRENT_ROUND_REF);
      if (!roundSnap.exists()) {
        await initializeRound();
        await new Promise(r => setTimeout(r, 800)); // tiny wait
      }

      const betData = {
        telegramId: telegramId.toString(),
        username: username || "Anonymous",
        amount: Number(amount),
        currency: currency.toUpperCase()
        // timestamp removed = this was the crash
      };

      await updateDoc(CURRENT_ROUND_REF, {
        bets: arrayUnion(betData),
        [`pot${currency.toUpperCase()}`]: increment(Number(amount)),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ BET SAVED: ${amount} ${currency} by ${username}`);
      return { success: true };
    } catch (err) {
      console.error("Place bet failed:", err);
      return { success: false, error: err.message };
    }
  };

  return { round, loading, error, placeBet };
};