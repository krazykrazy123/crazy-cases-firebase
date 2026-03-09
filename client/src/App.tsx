import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { useTelegramUser } from './utils/useTelegramUser';
import { TonConnectUIProvider, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import db from './db';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { usePvpRound } from './utils/pvpHooks';
import { collection, addDoc } from 'firebase/firestore';
import { useUserBalance } from './utils/useUserBalance';
import { getFunctions, httpsCallable } from 'firebase/functions';

const appFont = {
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 400,
};


function ClientTonConnectProvider({ children }) {
  
  if (typeof window === 'undefined') {
    return <>{children}</>; 
  }

  return (
    <TonConnectUIProvider manifestUrl="https://your-real-domain.com/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  );
}

function CustomHeader({ balance = { TON: 0, STARS: 0 }, onDepositClick }) {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const handleConnect = async () => {
    await tonConnectUI.openModal();
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#0f0f0f]/95 backdrop-blur-lg h-20 px-5 flex items-center justify-between border-b border-gray-800/50 overflow-visible" style={appFont}>
      {wallet ? (
        <span className="text-white font-semibold text-xl tracking-tight">
          {balance.TON.toFixed(2)} TON / {balance.STARS} Stars
        </span>
      ) : (
        <span className="text-transparent">Placeholder</span>
      )}

      <img
        src="/src/assets/logo.png"
        alt="Crazy Cases Logo"
        className="h-12 w-auto object-contain absolute left-1/2 -translate-x-1/2"
      />

      {!wallet ? (
        <button
          onClick={handleConnect}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2.5 rounded-full transition shadow-sm"
        >
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={onDepositClick}
          className="bg-[#1e1e2e] hover:bg-[#2a2a3a] text-white text-sm font-medium px-5 py-2.5 rounded-full transition shadow-sm flex items-center gap-2 border border-purple-500/30"
        >
          <span className="text-purple-400">Wallet:</span>
          {shortenAddress(wallet?.account?.address)}
        </button>
      )}
    </div>
  );
}

function DepositModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm" style={appFont}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative mt-auto bg-[#0f0f0f] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e2e]/80 backdrop-blur-lg sticky top-0 z-10">
          <button onClick={onClose} className="text-white text-3xl hover:text-purple-400 transition">←</button>
          <h2 className="text-2xl font-bold text-white">Deposit</h2>
          <button onClick={onClose} className="text-white text-4xl hover:text-red-400 transition">×</button>
        </div>
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 64px)' }}>
          <p className="text-center text-gray-300 mb-8">Choose how you want to deposit.</p>
          <div className="grid grid-cols-2 gap-5 w-full max-w-[440px] mx-auto">
            <div className="bg-[#1e1e2e] rounded-3xl p-5 text-center shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2">Deposit Stars</h3>
              <p className="text-yellow-400 mb-4">★100 = $1</p>
              <button className="w-full bg-purple-600 py-3 rounded-full font-bold text-white text-sm hover:bg-purple-700">
                Deposit Stars
              </button>
            </div>
            <div className="bg-[#1e1e2e] rounded-3xl p-5 text-center shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2">Deposit TON</h3>
              <p className="text-blue-400 mb-4">1 TON = ★500</p>
              <button className="w-full bg-purple-600 py-3 rounded-full font-bold text-white text-sm hover:bg-purple-700">
                Deposit TON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/')} className="fixed top-6 left-4 text-white text-4xl z-[100] hover:text-purple-400 transition-colors shadow-lg bg-black/30 p-2 rounded-full" style={appFont}>
      ←
    </button>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] px-4 mx-auto flex flex-col items-center justify-center" style={appFont}>
      <BackButton />
      <h1 className="text-3xl font-bold text-center text-white mb-6">{title}</h1>
      <p className="text-lg text-purple-400 text-center mb-6">Coming soon!</p>
      <Link to="/" className="bg-purple-600 px-6 py-3 rounded-full font-bold hover:bg-purple-700 transition text-white block w-fit mx-auto mt-4">
        Back to Cases
      </Link>
    </div>
  );
}

function LiveFeedBar() {
  const [liveDrops, setLiveDrops] = useState([]);
  useEffect(() => {
    const rouletteGifts = Array.from({ length: 60 }, (_, i) => {
      const id = i + 1;
      return { id, image: `${id}.png` };
    });
    const initialDrops = Array.from({ length: 25 }, (_, i) => {
      const randomGift = rouletteGifts[Math.floor(Math.random() * rouletteGifts.length)];
      return { ...randomGift, key: Date.now() + i };
    });
    setLiveDrops(initialDrops);
    const addDrop = () => {
      const randomGift = rouletteGifts[Math.floor(Math.random() * rouletteGifts.length)];
      setLiveDrops((prev) => [{ ...randomGift, key: Date.now() + Math.random() }, ...prev]);
      const nextDelay = Math.floor(Math.random() * 3600) + 1200;
      setTimeout(addDrop, nextDelay);
    };
    addDrop();
    return () => {};
  }, []);
  return (
    <div className="fixed top-[80px] left-0 right-0 z-[50] bg-[#0f0f0f]/90 backdrop-blur-md border-b border-gray-800/50" style={appFont}>
      <div className="overflow-hidden whitespace-nowrap py-1.5">
        <div className="inline-flex animate-marquee gap-2">
          {liveDrops.map((drop) => (
            <div key={drop.key} className="relative flex-shrink-0">
              <img src={`/src/assets/${drop.image}`} alt="" className="w-10 h-10 object-contain rounded-full" />
              {drop.id > 50 && <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-md pointer-events-none" />}
            </div>
          ))}
          {liveDrops.map((drop) => (
            <div key={`dup-${drop.key}`} className="relative flex-shrink-0">
              <img src={`/src/assets/${drop.image}`} alt="" className="w-10 h-10 object-contain rounded-full" />
              {drop.id > 50 && <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-md pointer-events-none" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <nav style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: '90px' }} className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-gray-800/50 p-4 flex justify-around items-center text-xs z-50 shadow-2xl" style={appFont}>
      <Link to="/" className="flex-1 flex flex-col items-center justify-center gap-1 text-purple-400 font-medium min-w-[60px]">
        <span className="text-3xl">🎲</span>Cases
      </Link>
      <Link to="/raffles" className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 min-w-[60px]">
        <span className="text-3xl">🎟️</span>Raffles
      </Link>
      <Link to="/tasks" className="relative flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 min-w-[60px]">
        <span className="text-3xl">✅</span>Tasks
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">5</span>
      </Link>
      <Link to="/leaderboard" className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 min-w-[60px]">
        <span className="text-3xl">🏆</span>Leaderboard
      </Link>
      <Link to="/rolls" className="flex-1 flex flex-col items-center justify-center gap-1 text-purple-400 font-medium min-w-[60px]">
        <span className="text-3xl">⚔️</span>PVP
      </Link>
      <Link to="/profile" className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 min-w-[60px]">
        <span className="text-3xl">👤</span>Profile
      </Link>
    </nav>
  );
}

function Home() {
  const navigate = useNavigate();
  const [showRouletteModal, setShowRouletteModal] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedFreeType, setSelectedFreeType] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonGift, setWonGift] = useState(null);
  const [showPossiblePrizes, setShowPossiblePrizes] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [dailyTimer, setDailyTimer] = useState(24 * 60 * 60);
  const [isDailyReady, setIsDailyReady] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoSubmitted, setPromoSubmitted] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const cases = [
    { name: 'Free', icon: '/src/assets/free case.png', count: 2, path: '/free', color: 'from-yellow-500 to-orange-600' },
    { name: 'PVP', icon: '/src/assets/5.png', count: 1, badges: ['New', 'PvP'], path: '/rolls', color: 'from-red-500 to-pink-600' },
    { name: 'Roulette', icon: '/src/assets/cases.png', count: 15, badges: ['New', 'Limit'], color: 'from-green-400 to-emerald-500' },
    { name: 'Crash', icon: '/src/assets/crash.png', badges: ['New'], path: '/crash', color: 'from-cyan-500 to-blue-600' },
    { name: 'Crazy Chance', icon: '/src/assets/crazychance.png', count: 6, path: '/crazy-chance', color: 'from-purple-500 to-pink-600' },
    { name: 'Upgrade', icon: '/src/assets/upgrade.png', description: 'Improve your gifts', path: '/upgrade', color: 'from-indigo-500 to-purple-600' },
  ];
  const rouletteCases = [
    { id: 1, name: 'Bear', price: 199 },
    { id: 2, name: 'Player', price: 199 },
    { id: 3, name: 'Skull', price: 249 },
    { id: 4, name: 'Lamp', price: 299 },
    { id: 5, name: 'Perfume', price: 399 },
    { id: 6, name: 'Papakha', price: 499 },
    { id: 7, name: 'UFC', price: 519 },
    { id: 8, name: 'Crystal', price: 685 },
    { id: 9, name: 'Headset', price: 758 },
  ];
  const rouletteGifts = Array.from({ length: 60 }, (_, i) => {
    const id = i + 1;
    return { id, image: `${id}.png`, name: `Mystic Relic #${id}` };
  });
  useEffect(() => {
    let interval;
    if (selectedFreeType === 'daily' && dailyTimer > 0) {
      interval = setInterval(() => {
        setDailyTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsDailyReady(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dailyTimer, selectedFreeType]);
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };
  const handleDailyOpen = () => {
    if (!isDailyReady || isSpinning) return;
    setIsSpinning(true);
    setWonGift(null);
    setTimeout(() => {
      const r = Math.random();
      let giftIndex = r < 0.85 ? Math.floor(Math.random() * 50) : r < 0.98 ? 50 + Math.floor(Math.random() * 9) : 59;
      const won = rouletteGifts[giftIndex];
      setWonGift(won);
      setIsSpinning(false);
      setDailyTimer(24 * 60 * 60);
      setIsDailyReady(false);
    }, 6500);
  };
  const handlePromoSubmit = () => {
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code');
      return;
    }
    if (promoCode.length >= 5) {
      setPromoError('');
      setPromoSubmitted(true);
    } else {
      setPromoError('Invalid promo code');
    }
  };
  const handleOpenGorilla = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonGift(null);
    const strip = document.getElementById('prize-strip') as HTMLElement;
    if (!strip) return;
    const r = Math.random();
    let giftIndex = r < 0.85 ? Math.floor(Math.random() * 50) : r < 0.98 ? 50 + Math.floor(Math.random() * 9) : 59;
    const won = rouletteGifts[giftIndex];
    const itemWidth = 132;
    const centerOffset = 60;
    const finalTranslate = -(giftIndex * itemWidth + centerOffset - 40);
    setTimeout(() => {
      strip.style.transition = 'transform 7500ms cubic-bezier(0.0, 0.0, 0.1, 1)';
      strip.style.transform = `translateX(${finalTranslate}px)`;
    }, 30);
    setTimeout(() => {
      setWonGift(won);
      setIsSpinning(false);
      console.log(`[AUDIT] RNG seed used, won item ID: ${won.id}`);
      setTimeout(() => {
        if (strip) {
          strip.style.transition = 'none';
          strip.style.transform = 'translateX(0px)';
        }
      }, 900);
    }, 7800);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] mx-auto" style={appFont}>
      <LiveFeedBar />
      <main className="pt-4 px-4 max-w-[440px] mx-auto">
        {cases.map((game) => (
          <div
            key={game.name}
            onClick={() => {
              if (game.name === 'Roulette') setShowRouletteModal(true);
              else if (game.name === 'Free') setShowFreeModal(true);
              else if (game.path) navigate(game.path);
            }}
            className="rounded-3xl p-5 mb-4 shadow-xl hover:shadow-2xl transition-all cursor-pointer block w-full bg-[#1e1e2e]"
          >
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br ${game.color} flex-shrink-0 shadow-lg ring-1 ring-white/20`}>
                <img src={game.icon} alt={game.name} className="w-16 h-16 object-contain drop-shadow-md" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1 text-white">{game.name}</h3>
                {game.count && <p className="text-base opacity-90 text-gray-300">{game.count} cases</p>}
                {game.description && <p className="text-sm opacity-80 text-gray-300">{game.description}</p>}
                {game.badges && (
                  <div className="flex gap-2 mt-2">
                    {game.badges.map((badge) => (
                      <span key={badge} className="text-xs bg-black/60 px-3 py-1 rounded-full text-purple-300">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>
      {showRouletteModal && !selectedCase && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowRouletteModal(false)} />
          <div className="relative mt-auto bg-[#0f0f0f] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e2e]/80 backdrop-blur-lg sticky top-0 z-10">
              <button onClick={() => setShowRouletteModal(false)} className="text-white text-3xl hover:text-purple-400 transition">←</button>
              <h2 className="text-2xl font-bold text-white">Roulette</h2>
              <button onClick={() => setShowRouletteModal(false)} className="text-white text-4xl hover:text-red-400 transition">×</button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 64px)' }}>
              <div className="grid grid-cols-2 gap-5 w-full max-w-[440px] mx-auto">
                {rouletteCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => setSelectedCase(caseItem.id)}
                    className="bg-[#1e1e2e] rounded-3xl overflow-hidden shadow-xl cursor-pointer"
                  >
                    <div className="pt-4 px-4 text-center">
                      <h3 className="text-base font-bold text-white">{caseItem.name}</h3>
                    </div>
                    <div className="px-4 py-2 flex justify-center">
                      <img src={`/src/assets/case ${caseItem.id}.png`} alt={caseItem.name} className="w-full max-h-[700px] object-contain scale-200" />
                    </div>
                    <div className="px-4 pb-4 text-center">
                      <p className="text-yellow-400 font-medium text-sm mb-3">★{caseItem.price}</p>
                      <button className="w-full bg-purple-600 py-2 rounded-full font-bold text-white text-sm">Open</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showFreeModal && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowFreeModal(false)} />
          <div className="relative mt-auto bg-[#0f0f0f] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e2e]/80 backdrop-blur-lg sticky top-0 z-10">
              <button onClick={() => setShowFreeModal(false)} className="text-white text-3xl hover:text-purple-400 transition">←</button>
              <h2 className="text-2xl font-bold text-white">Free Cases</h2>
              <button onClick={() => setShowFreeModal(false)} className="text-white text-4xl hover:text-red-400 transition">×</button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 64px)' }}>
              <div className="grid grid-cols-2 gap-5 w-full max-w-[440px] mx-auto">
                {[
                  { id: 'daily', name: 'Daily Free Case', price: 'Free', icon: '/src/assets/free case.png' },
                  { id: 'promo', name: 'Promo Code Case', price: 'Free', icon: '/src/assets/cases.png' },
                ].map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => {
                      if (caseItem.id === 'daily') {
                        setSelectedFreeType('daily');
                        setDailyTimer(24 * 60 * 60);
                        setIsDailyReady(false);
                      } else {
                        setSelectedFreeType('promo');
                        setPromoCode('');
                        setPromoSubmitted(false);
                        setPromoError('');
                      }
                      setSelectedCase(999);
                      setShowFreeModal(false);
                    }}
                    className="bg-[#1e1e2e] rounded-3xl overflow-hidden shadow-xl cursor-pointer"
                  >
                    <div className="pt-4 px-4 text-center">
                      <h3 className="text-base font-bold text-white">{caseItem.name}</h3>
                    </div>
                    <div className="px-4 py-2 flex justify-center">
                      <img src={caseItem.icon} alt={caseItem.name} className="w-full max-h-[700px] object-contain scale-200" />
                    </div>
                    <div className="px-4 pb-4 text-center">
                      <p className="text-yellow-400 font-medium text-sm mb-3">{caseItem.price}</p>
                      <button className="w-full bg-purple-600 py-2 rounded-full font-bold text-white text-sm">Open</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedCase && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-black/60 backdrop-blur-xl border-b border-gray-800/50 z-10">
            <button
              onClick={() => { setSelectedCase(null); setWonGift(null); setSelectedFreeType(null); setPromoSubmitted(false); setPromoCode(''); setPromoError(''); }}
              className="text-3xl text-gray-400 hover:text-white transition"
            >
              ←
            </button>
            <div className="text-xl font-bold tracking-tight text-white">Roulette</div>
            <button
              onClick={() => setShowPossiblePrizes(true)}
              className="text-purple-400 font-medium text-sm flex items-center gap-1"
            >
              Prizes
            </button>
          </div>
          <LiveFeedBar />
          <div className="flex-1 relative flex items-center justify-center px-4 overflow-hidden mt-[80px]">
            <div className="relative w-full max-w-[440px] mx-auto">
              <div
                id="prize-strip"
                className="flex items-center gap-6 transition-transform duration-[6800ms] ease-out"
                style={{ transform: 'translateX(0px)' }}
              >
                {[...rouletteGifts, ...rouletteGifts, ...rouletteGifts, ...rouletteGifts, ...rouletteGifts].map((gift, i) => (
                  <div key={i} className="flex-shrink-0 w-[160px] flex justify-center py-2 relative z-10">
                    <img
                      src={`/src/assets/${gift.image}`}
                      alt={gift.name}
                      className="w-40 h-40 object-contain scale-175 drop-shadow-2xl"
                    />
                  </div>
                ))}
              </div>
              <div className="absolute left-1/2 top-[85%] -translate-x-1/2 z-20 pointer-events-none">
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-white" />
              </div>
              <div className="absolute inset-x-0 top-1/2 h-[140px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#0a001a]/95 to-transparent pointer-events-none z-[-1]" />
            </div>
          </div>
          <div className="p-5 bg-[#0f0f0f]/95 backdrop-blur-2xl">
            {selectedFreeType ? (
              selectedFreeType === 'daily' ? (
                <button
                  onClick={handleDailyOpen}
                  disabled={!isDailyReady || isSpinning}
                  className={`w-full py-6 rounded-3xl font-bold text-2xl shadow-2xl transition-all ${
                    isDailyReady && !isSpinning
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-800 cursor-not-allowed text-gray-400'
                  }`}
                >
                  {isDailyReady ? (isSpinning ? 'SPINNING...' : 'Open Case') : `Wait ${formatTime(dailyTimer)}`}
                </button>
              ) : (
                !promoSubmitted ? (
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-4 text-white">Enter Promo Code</h3>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo code here"
                      className="w-full p-4 rounded-full bg-black/50 text-white text-center mb-4 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base"
                    />
                    {promoError && <p className="text-red-500 mb-4">{promoError}</p>}
                    <button
                      onClick={handlePromoSubmit}
                      className="w-full bg-purple-600 py-4 rounded-full font-bold text-white text-lg hover:bg-purple-700 transition"
                    >
                      Submit Code
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleOpenGorilla}
                    disabled={isSpinning}
                    className={`w-full py-6 rounded-3xl font-bold text-2xl shadow-2xl transition-all ${
                      isSpinning ? 'bg-gray-800 cursor-not-allowed text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isSpinning ? 'SPINNING...' : 'Open Case'}
                  </button>
                )
              )
            ) : (
              <>
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setShowPossiblePrizes(true)}
                    className="flex-1 py-5 bg-[#1e1e2e] rounded-3xl font-semibold text-sm hover:bg-[#2a2a3e] transition border-none text-white"
                  >
                    Possible prizes
                  </button>
                  <button
                    onClick={() => setIsDemoMode(!isDemoMode)}
                    className={`flex-1 py-5 rounded-3xl font-semibold text-sm transition flex items-center justify-center gap-2 border-none text-white ${
                      isDemoMode ? 'bg-green-600' : 'bg-[#1e1e2e] hover:bg-[#2a2a3e]'
                    }`}
                  >
                    Demo Mode
                    <div className={`w-10 h-5 rounded-full relative transition-all ${isDemoMode ? 'bg-green-400' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isDemoMode ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
                <button
                  onClick={handleOpenGorilla}
                  disabled={isSpinning}
                  className={`w-full py-6 rounded-3xl font-bold text-2xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.985] border-none text-white ${
                    isSpinning
                      ? 'bg-gray-800 cursor-not-allowed text-gray-400'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isSpinning ? 'SPINNING...' : 'Spin for ★199'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {showPossiblePrizes && (
        <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#1a1625] rounded-3xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Possible prizes</h2>
              <button
                onClick={() => setShowPossiblePrizes(false)}
                className="text-4xl text-gray-400 hover:text-white transition"
              >
                ×
              </button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto">
              {rouletteGifts.map((gift) => (
                <div key={gift.id} className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#0f0f0f] p-3 mb-3 shadow-inner">
                    <img src={`/src/assets/${gift.image}`} alt={gift.name} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-tight mb-1">{gift.name}</p>
                  <p className="text-yellow-400 text-sm font-bold">★{Math.floor(100 + Math.random() * 800)}</p>
                </div>
              ))}
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowPossiblePrizes(false)}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-3xl font-bold text-lg transition border-none text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {wonGift && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-gradient-to-br from-[#0f0f23] via-[#1a1625] to-[#0a001a] w-full max-w-[360px] rounded-3xl shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setWonGift(null)}
              className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-red-400 transition"
            >
              ×
            </button>
            <div className="pt-8 pb-4 text-center">
              <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_20px_#10b981]">
                YOU WON!
              </h2>
            </div>
            <div className="flex justify-center px-6 pb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-[32px] blur-2xl" />
                <img
                  src={`/src/assets/${wonGift.image}`}
                  alt={wonGift.name}
                  className="w-48 h-48 object-contain relative drop-shadow-[0_0_40px_#a5f3fc] z-10"
                />
              </div>
            </div>
            <div className="px-6 text-center pb-6">
              <p className="text-2xl font-bold text-white tracking-tight mb-1">{wonGift.name}</p>
              <p className="text-3xl font-black text-yellow-400 tracking-tighter flex items-center justify-center gap-2">
                ★ 490
              </p>
            </div>
            <div className="px-6 pb-8 grid grid-cols-2 gap-4">
              <button className="py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985] text-white">
                Sell Instant
              </button>
              <button
                onClick={() => setWonGift(null)}
                className="py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985] text-white"
              >
                Collect Gift
              </button>
            </div>
            <div className="text-center pb-5 text-xs text-purple-400/70">
              @Crazy_cases_bot
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Roulette() {
  const prizes = [
    { name: 'Shard', price: 699, badge: '' },
    { name: 'Pepe', price: 2999, badge: 'Win-win' },
    { name: 'Investor', price: 9999, badge: 'Limit' },
    { name: 'Legendary', price: 49999, badge: 'New' },
    { name: 'Epic', price: 99999, badge: 'Hot' },
    { name: 'Rare', price: 199999, badge: '' },
    { name: 'Uncommon', price: 499999, badge: '' },
    { name: 'Common', price: 999999, badge: 'Popular' },
    { name: 'Mystery', price: 149999, badge: 'New' },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-20 px-4 mx-auto flex flex-col items-center" style={appFont}>
      <LiveFeedBar />
      <h1 className="text-3xl font-bold text-center text-white mb-6">Roulette</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-[440px]">
        {prizes.map((prize) => (
          <div key={prize.name} className="rounded-3xl p-5 shadow-xl hover:shadow-2xl transition-all cursor-pointer bg-[#1e1e2e] text-center">
            <h2 className="text-xl font-bold mb-1 text-white">{prize.name}</h2>
            <p className="text-purple-400 font-medium">★{prize.price}</p>
            {prize.badge && (
              <span className="text-xs bg-black/60 px-3 py-1 rounded-full mt-1 inline-block text-purple-300">
                {prize.badge}
              </span>
            )}
            <button className="mt-3 bg-purple-600 px-6 py-2 rounded-full font-bold text-white hover:bg-purple-700 transition w-full text-sm">
              Play
            </button>
          </div>
        ))}
      </div>
      <Link to="/" className="block mt-6 mb-8 text-center text-purple-400 hover:underline text-base">
        Back to Cases
      </Link>
    </div>
  );
}

function Free() {
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [selectedFreeCase, setSelectedFreeCase] = useState(null);
  const [dailyTimer, setDailyTimer] = useState(24 * 60 * 60);
  const [isDailyReady, setIsDailyReady] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoSubmitted, setPromoSubmitted] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonGift, setWonGift] = useState(null);
  const freeCases = [
    { id: 'daily', name: 'Daily Free Case', price: 'Free', icon: '/src/assets/free case.png', color: 'from-yellow-500 to-orange-600' },
    { id: 'promo', name: 'Promo Code Case', price: 'Free', icon: '/src/assets/cases.png', color: 'from-purple-500 to-pink-600' },
  ];
  const rouletteGifts = Array.from({ length: 60 }, (_, i) => {
    const id = i + 1;
    return { id, image: `${id}.png`, name: `Mystic Relic #${id}` };
  });
  useEffect(() => {
    let interval;
    if (dailyTimer > 0) {
      interval = setInterval(() => {
        setDailyTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsDailyReady(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dailyTimer]);
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };
  const handleFreeCaseClick = (caseId) => {
    setSelectedFreeCase(caseId);
    setShowFreeModal(true);
    setPromoSubmitted(false);
  };
  const handleDailyOpen = () => {
    if (!isDailyReady || isSpinning) return;
    setIsSpinning(true);
    setWonGift(null);
    setTimeout(() => {
      const r = Math.random();
      let giftIndex = r < 0.85 ? Math.floor(Math.random() * 50) : r < 0.98 ? 50 + Math.floor(Math.random() * 9) : 59;
      const won = rouletteGifts[giftIndex];
      setWonGift(won);
      setIsSpinning(false);
      setDailyTimer(24 * 60 * 60);
      setIsDailyReady(false);
    }, 6500);
  };
  const handlePromoSubmit = () => {
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code');
      return;
    }
    if (promoCode.length >= 5) {
      setPromoError('');
      setPromoSubmitted(true);
    } else {
      setPromoError('Invalid promo code');
    }
  };
  const handleOpenGorillaFree = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonGift(null);
    const strip = document.getElementById('prize-strip-free') as HTMLElement;
    if (!strip) return;
    const r = Math.random();
    let giftIndex = r < 0.85 ? Math.floor(Math.random() * 50) : r < 0.98 ? 50 + Math.floor(Math.random() * 9) : 59;
    const won = rouletteGifts[giftIndex];
    const itemWidth = 132;
    const centerOffset = 60;
    const finalTranslate = -(giftIndex * itemWidth + centerOffset - 40);
    setTimeout(() => {
      strip.style.transition = 'transform 7500ms cubic-bezier(0.0, 0.0, 0.1, 1)';
      strip.style.transform = `translateX(${finalTranslate}px)`;
    }, 30);
    setTimeout(() => {
      setWonGift(won);
      setIsSpinning(false);
      setTimeout(() => {
        if (strip) {
          strip.style.transition = 'none';
          strip.style.transform = 'translateX(0px)';
        }
      }, 900);
    }, 7800);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] mx-auto flex flex-col items-center overflow-y-auto" style={appFont}>
      <LiveFeedBar />
      <h1 className="text-3xl font-bold text-center text-white mb-6">Free Cases</h1>
      <div className="grid grid-cols-2 gap-5 w-full max-w-[440px]">
        {freeCases.map((caseItem) => (
          <div
            key={caseItem.id}
            onClick={() => handleFreeCaseClick(caseItem.id)}
            className="bg-[#1e1e2e] rounded-3xl overflow-hidden shadow-xl cursor-pointer"
          >
            <div className="pt-4 px-4 text-center">
              <h3 className="text-base font-bold text-white">{caseItem.name}</h3>
            </div>
            <div className="px-4 py-2 flex justify-center">
              <img src={caseItem.icon} alt={caseItem.name} className="w-full max-h-[700px] object-contain scale-200" />
            </div>
            <div className="px-4 pb-4 text-center">
              <p className="text-yellow-400 font-medium text-sm mb-3">{caseItem.price}</p>
              <button className="w-full bg-purple-600 py-2 rounded-full font-bold text-white text-sm">Select</button>
            </div>
          </div>
        ))}
      </div>
      {showFreeModal && selectedFreeCase && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowFreeModal(false)} />
          <div className="relative mt-auto bg-[#0f0f0f] rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e2e]/80 backdrop-blur-lg sticky top-0 z-10">
              <button onClick={() => setShowFreeModal(false)} className="text-white text-3xl hover:text-purple-400 transition">←</button>
              <h2 className="text-2xl font-bold text-white">
                {selectedFreeCase === 'daily' ? 'Daily Free Case' : 'Promo Code Case'}
              </h2>
              <button onClick={() => setShowFreeModal(false)} className="text-white text-4xl hover:text-red-400 transition">×</button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 64px)' }}>
              {selectedFreeCase === 'promo' && !wonGift && !promoSubmitted && (
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-4 text-white">Enter Promo Code</h3>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code here"
                    className="w-full p-4 rounded-full bg-black/50 text-white text-center mb-4 focus:outline-none focus:ring-2 focus:ring-purple-600 text-base"
                  />
                  {promoError && <p className="text-red-500 mb-4">{promoError}</p>}
                  <button
                    onClick={handlePromoSubmit}
                    className="w-full bg-purple-600 py-4 rounded-full font-bold text-white text-lg hover:bg-purple-700 transition"
                  >
                    Submit Code
                  </button>
                </div>
              )}
              {selectedFreeCase === 'promo' && promoSubmitted && !wonGift && (
                <div className="text-center">
                  <button
                    onClick={handleOpenGorillaFree}
                    disabled={isSpinning}
                    className={`w-full py-6 rounded-3xl font-bold text-2xl shadow-2xl transition-all ${
                      isSpinning ? 'bg-gray-800 cursor-not-allowed text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isSpinning ? 'SPINNING...' : 'Open Case'}
                  </button>
                </div>
              )}
              {(selectedFreeCase === 'daily' || wonGift) && (
                <div className="relative flex flex-col items-center">
                  <div className="relative w-full max-w-[440px] mx-auto">
                    <div
                      id="prize-strip-free"
                      className="flex items-center gap-6 transition-transform duration-[6800ms] ease-out"
                      style={{ transform: 'translateX(0px)' }}
                    >
                      {[...rouletteGifts, ...rouletteGifts, ...rouletteGifts, ...rouletteGifts, ...rouletteGifts].map((gift, i) => (
                        <div key={i} className="flex-shrink-0 w-[160px] flex justify-center py-2">
                          <img
                            src={`/src/assets/${gift.image}`}
                            alt={gift.name}
                            className="w-40 h-40 object-contain scale-175"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="absolute left-1/2 top-[85%] -translate-x-1/2 z-20 pointer-events-none">
                      <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-white" />
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-[140px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#0a001a]/95 to-transparent pointer-events-none z-10" />
                  </div>
                  <button
                    onClick={handleDailyOpen}
                    disabled={!isDailyReady || isSpinning}
                    className={`mt-6 w-full max-w-[440px] py-6 rounded-3xl font-bold text-2xl shadow-2xl transition-all ${
                      isDailyReady && !isSpinning
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-800 cursor-not-allowed text-gray-400'
                    }`}
                  >
                    {isDailyReady ? (isSpinning ? 'SPINNING...' : 'Open Case') : `Wait ${formatTime(dailyTimer)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {wonGift && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-gradient-to-br from-[#0f0f23] via-[#1a1625] to-[#0a001a] w-full max-w-[360px] rounded-3xl shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setWonGift(null)}
              className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-red-400 transition"
            >
              ×
            </button>
            <div className="pt-8 pb-4 text-center">
              <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_20px_#10b981]">
                YOU WON!
              </h2>
            </div>
            <div className="flex justify-center px-6 pb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-[32px] blur-2xl" />
                <img
                  src={`/src/assets/${wonGift.image}`}
                  alt={wonGift.name}
                  className="w-48 h-48 object-contain relative drop-shadow-[0_0_40px_#a5f3fc] z-10"
                />
              </div>
            </div>
            <div className="px-6 text-center pb-6">
              <p className="text-2xl font-bold text-white tracking-tight mb-1">{wonGift.name}</p>
              <p className="text-3xl font-black text-yellow-400 tracking-tighter flex items-center justify-center gap-2">
                ★ 490
              </p>
            </div>
            <div className="px-6 pb-8 grid grid-cols-2 gap-4">
              <button className="py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985] text-white">
                Sell Instant
              </button>
              <button
                onClick={() => setWonGift(null)}
                className="py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985] text-white"
              >
                Collect Gift
              </button>
            </div>
            <div className="text-center pb-5 text-xs text-purple-400/70">
              @Crazy_cases_bot
            </div>
          </div>
        </div>
      )}
      <Link to="/" className="block mt-6 mb-8 text-center text-purple-400 hover:underline text-base">
        Back to Cases
      </Link>
    </div>
  );
}

function Crash() {
  const [phase, setPhase] = useState('betting');
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [playerBet, setPlayerBet] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [betInputAmount, setBetInputAmount] = useState('');
  const runningVideoRef = useRef(null);
  const bustVideoRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonGift, setWonGift] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [topDarkness, setTopDarkness] = useState(0);
  useEffect(() => {
    if (phase === 'betting') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startRound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);
  useEffect(() => {
    if (phase === 'running' && crashPoint) {
      if (runningVideoRef.current) {
        runningVideoRef.current.currentTime = 0;
        runningVideoRef.current.play().catch(() => {});
      }
      const interval = setInterval(() => {
        setMultiplier((prev) => {
          const increment = 0.008 + (prev * 0.012);
          const next = Number((prev + increment).toFixed(2));
          if (next >= crashPoint) {
            clearInterval(interval);
            handleCrash();
            return crashPoint;
          }
          setTopDarkness(Math.min(0.98, (next - 1) / 40));
          return next;
        });
      }, 45);
      return () => clearInterval(interval);
    }
  }, [phase, crashPoint]);
  const startRound = () => {
    const crash = generateCrashPoint();
    setCrashPoint(crash);
    setPhase('running');
    setMultiplier(1.00);
    setCountdown(0);
    setBetInputAmount('');
    setIsSpinning(false);
    setWonGift(null);
    setTopDarkness(0);
    if (runningVideoRef.current) {
      runningVideoRef.current.currentTime = 0;
      runningVideoRef.current.play().catch(() => {});
    }
  };
  const handleCrash = () => {
    setPhase('crashed');
    if (runningVideoRef.current) runningVideoRef.current.pause();
    if (bustVideoRef.current) {
      bustVideoRef.current.currentTime = 0;
      bustVideoRef.current.play().catch(() => {});
    }
    if (playerBet && playerBet.status === 'pending') {
      const payout = playerBet.amount * crashPoint;
      const profit = payout - playerBet.amount;
      setPlayerBet({
        ...playerBet,
        status: 'lose',
        payout: payout.toFixed(2),
        profit: profit.toFixed(2),
      });
    }
    setHistory((prev) => [crashPoint, ...prev.slice(0, 9)]);
    setTimeout(() => {
      setPhase('betting');
      setCountdown(15);
      setMultiplier(1.00);
      setCrashPoint(null);
      setPlayerBet(null);
      setBetInputAmount('');
      setTopDarkness(0);
    }, 5000);
  };
  const cashOut = () => {
    if (phase !== 'running' || !playerBet || playerBet.status !== 'pending') return;
    const payout = playerBet.amount * multiplier;
    const profit = payout - playerBet.amount;
    setPlayerBet({
      ...playerBet,
      status: 'cashed',
      payout: payout.toFixed(2),
      profit: profit.toFixed(2),
      cashoutMultiplier: multiplier,
    });
    setToast({ message: `Cashed out at ${multiplier.toFixed(2)}×! +${profit.toFixed(2)}`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };
  const placeOrUpdateBet = (currency = 'Stars') => {
    if (phase !== 'betting') return alert('Betting closed!');
    if (!betInputAmount || Number(betInputAmount) <= 0) return alert('Enter valid amount');
    const newAmount = Number(betInputAmount);
    let updatedAmount = newAmount;
    if (playerBet) {
      updatedAmount = playerBet.amount + newAmount;
    }
    setPlayerBet({
      amount: updatedAmount,
      currency,
      status: 'pending',
    });
    setToast({ message: playerBet ? `Added ${newAmount} → Total: ${updatedAmount}` : `Bet placed: ${updatedAmount}`, type: 'success' });
    setTimeout(() => setToast(null), 2500);
    setBetInputAmount('');
  };
  const generateCrashPoint = () => {
    const r = Math.random();
    let point;
    if (r < 0.35) point = 1.0 + r * 3;
    else if (r < 0.65) point = 1.0 + r * 8;
    else if (r < 0.85) point = 1.0 + r * 25;
    else point = 1.0 + r * 120;
    return Math.min(point, 100);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white relative overflow-hidden" style={appFont}>
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-70 animate-twinkle"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-x-0 top-0 h-[65%] bg-black transition-opacity duration-300 pointer-events-none z-10"
        style={{ opacity: topDarkness }}
      />
      <LiveFeedBar />
      <BackButton />
      <div className="flex-1 flex flex-col items-center relative z-20 px-4">
        {phase === 'betting' && (
          <div className="mt-12 text-center">
            <div className="text-7xl font-black text-yellow-400 drop-shadow-2xl">{countdown}</div>
            <p className="text-xl text-gray-400 mt-3">Round starts in</p>
          </div>
        )}
        <div className="flex flex-col items-center mt-8 mb-10">
          <video
            ref={runningVideoRef}
            src="/src/assets/rocket-run-loop.mp4"
            loop
            muted
            playsInline
            autoPlay
            className={`w-48 h-48 object-contain mb-4 ${phase !== 'running' ? 'hidden' : ''}`}
          />
          <video
            ref={bustVideoRef}
            src="/src/assets/rocket-bust.mp4"
            muted
            playsInline
            className={`w-48 h-48 object-contain mb-4 ${phase !== 'crashed' ? 'hidden' : ''}`}
          />
          {phase === 'running' && (
            <p className="text-6xl font-black text-white drop-shadow-2xl">
              {multiplier.toFixed(2)}x
            </p>
          )}
          {phase === 'crashed' && (
            <p className="text-6xl font-black text-red-600 animate-pulse drop-shadow-2xl">
              x{crashPoint?.toFixed(2)}
            </p>
          )}
        </div>
        <div className="w-full overflow-x-auto mb-10">
          <div className="flex gap-3 px-2 min-w-max">
            {history.map((point, i) => (
              <span key={i} className="text-lg bg-white/10 px-5 py-2 rounded-full text-white font-medium">
                x{point.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full max-w-[440px] bg-black/50 backdrop-blur-lg rounded-3xl p-5 border border-white/10 mb-10">
          <h3 className="text-xl font-bold text-white mb-4">No Bet Yet</h3>
          <div className="flex items-center justify-between mb-3 text-gray-400 text-sm">
            <span>Possible Prize</span>
            <span className="text-yellow-400">★</span>
          </div>
          {[
            { name: 'fuzhitap', amount: 1907, x: 1.09, result: 'win' },
            { name: 'd3r3my10', amount: 163, x: 1.09, result: 'win' },
            { name: 'Svyat_x', amount: 54, x: 1.09, result: 'win' },
          ].map((player, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-t border-white/10">
              <img src="/src/assets/avatar-placeholder.png" alt="Avatar" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <p className="text-white">{player.name}</p>
              </div>
              <p className="text-yellow-400 font-bold">★{player.amount} x{player.x}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-sm mb-4">About the game</p>
      </div>
      <div className="flex justify-center w-full px-4 pb-12">
        <button
          onClick={() => setShowDepositModal(true)}
          className="w-full max-w-[440px] bg-purple-600 hover:bg-purple-700 py-6 rounded-3xl font-bold text-white text-2xl shadow-2xl transition-all active:scale-95"
        >
          Make Bet
        </button>
      </div>
      <Link
        to="/"
        className="mt-2 text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors flex items-center justify-center gap-2"
      >
        ← Back to Cases
      </Link>
    </div>
  );
}

function CrazyChance() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] px-4 mx-auto flex flex-col items-center" style={appFont}>
      <LiveFeedBar />
      <h1 className="text-3xl font-bold text-center text-white mb-6">Crazy Chance</h1>
      <p className="text-lg text-purple-400 text-center mb-6 max-w-md mx-auto">Coming soon!</p>
      <Link to="/" className="block mt-6 mb-8 text-center text-purple-400 hover:underline text-base">
        Back to Cases
      </Link>
    </div>
  );
}

function Upgrade() {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [targetGift, setTargetGift] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState(null);
  const rouletteGifts = Array.from({ length: 60 }, (_, i) => {
    const id = i + 1;
    return {
      id,
      image: `${id}.png`,
      name: `Mystic Relic #${id}`,
      value: Math.floor(100 + Math.random() * 800),
    };
  });
  const userInventory = rouletteGifts.slice(0, 20);
  const possibleTargets = Array.from({ length: 15 }, (_, i) => {
    const multiplier = i + 2;
    const gift = rouletteGifts[multiplier - 1];
    return {
      id: 100 + multiplier,
      name: `${multiplier}x Upgrade`,
      value: 12500 * multiplier,
      image: gift.image,
      displayName: `${multiplier}x Upgrade`,
      multiplier,
    };
  });
  const handleSelectGift = (gift) => {
    setSelectedGift(gift);
    setShowGiftModal(false);
    setTargetGift(null);
    setUpgradeResult(null);
    setIsSpinning(false);
  };
  const handleSelectTarget = (target) => {
    setTargetGift(target);
    setShowTargetModal(false);
    setUpgradeResult(null);
    setIsSpinning(false);
  };
  const calculateWinChance = () => {
    if (!selectedGift || !targetGift) return 50;
    const ratio = targetGift.multiplier;
    if (ratio <= 2) return 50;
    if (ratio <= 4) return 25;
    if (ratio <= 6) return 15;
    if (ratio <= 8) return 10;
    if (ratio <= 10) return 8;
    return Math.max(5, Math.round(100 / ratio));
  };
  const generateStripItems = (winChance) => {
    const totalSlots = 300;
    const winSlots = Math.round(totalSlots * (winChance / 100));
    const pattern = Array(winSlots).fill('win').concat(Array(totalSlots - winSlots).fill('loss'));
    for (let i = pattern.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
    }
    return pattern;
  };
  const handleUpgradeGorilla = () => {
    if (isSpinning || !selectedGift || !targetGift) return;
    setIsSpinning(true);
    setUpgradeResult(null);
    const strip = document.getElementById('prize-strip-upgrade');
    if (!strip) return;
    const winChance = calculateWinChance();
    const success = Math.random() < winChance / 100;
    const stripItems = generateStripItems(winChance);
    const targetType = success ? 'win' : 'loss';
    const possibleIndices = stripItems.reduce((acc, type, idx) => {
      if (type === targetType) acc.push(idx);
      return acc;
    }, []);
    const landingIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)] || 0;
    const itemWidth = 132;
    const centerOffset = 60;
    strip.style.transform = 'translateX(0px)';
    const finalTranslate = -(landingIndex * itemWidth + centerOffset - 40);
    setTimeout(() => {
      strip.style.transition = 'transform 7500ms cubic-bezier(0.0, 0.0, 0.1, 1)';
      strip.style.transform = `translateX(${finalTranslate}px)`;
    }, 30);
    setTimeout(() => {
      setUpgradeResult({ success, gift: success ? targetGift : null });
      setIsSpinning(false);
      if (success) {
        console.log(`[UPGRADE SUCCESS] ${selectedGift.name} → x${targetGift.multiplier} (★${targetGift.value})`);
      } else {
        console.log(`[UPGRADE FAILED] Lost ${selectedGift.name}`);
      }
      setTimeout(() => {
        if (strip) {
          strip.style.transition = 'none';
          strip.style.transform = 'translateX(0px)';
        }
      }, 900);
    }, 7800);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] px-4 mx-auto flex flex-col items-center overflow-y-auto" style={appFont}>
      <LiveFeedBar />
      <img
        src="/src/assets/dog-nft-gifts.png"
        alt="Our dog holding NFT gifts"
        className="w-32 h-32 object-contain mx-auto mb-6 drop-shadow-xl"
      />
      <h1 className="text-3xl font-bold text-center text-white mb-6">Upgrade Gifts</h1>
      <p className="text-center text-gray-300 mb-6 max-w-md mx-auto text-base">
        Select one of your NFT gifts and a target multiplier, then spin to upgrade.<br />
        Higher multipliers = lower chance but much bigger value.
      </p>
      <div className="flex flex-row items-center gap-4 mb-10 w-full max-w-[440px]">
        <div
          onClick={() => setShowGiftModal(true)}
          className="flex-1 h-56 bg-[#1e1e2e] rounded-3xl shadow-xl flex flex-col items-center justify-center cursor-pointer hover:shadow-2xl transition-all duration-300"
        >
          {selectedGift ? (
            <>
              <div className="w-24 h-24 rounded-2xl overflow-hidden mb-3">
                <img
                  src={`/src/assets/${selectedGift.image}`}
                  alt={selectedGift.name}
                  className="w-full h-full object-contain scale-125"
                />
              </div>
              <h2 className="text-xl font-bold text-white text-center px-4">{selectedGift.name}</h2>
              <p className="text-yellow-400 text-sm mt-1">★{selectedGift.value}</p>
            </>
          ) : (
            <>
              <div className="text-7xl text-white mb-3">+</div>
              <h2 className="text-2xl font-bold text-white text-center drop-shadow-lg px-6">
                Gift to Upgrade
              </h2>
            </>
          )}
        </div>
        <div
          onClick={() => selectedGift && setShowTargetModal(true)}
          className={`flex-1 h-56 bg-[#1e1e2e] rounded-3xl shadow-xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${
            selectedGift ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
          }`}
        >
          {targetGift ? (
            <>
              <div className="w-24 h-24 rounded-2xl overflow-hidden mb-3">
                <img
                  src={`/src/assets/${targetGift.image}`}
                  alt={targetGift.name}
                  className="w-full h-full object-contain scale-125"
                />
              </div>
              <h2 className="text-xl font-bold text-white text-center px-4">{targetGift.displayName}</h2>
              <p className="text-yellow-400 text-sm mt-1">★{targetGift.value}</p>
            </>
          ) : (
            <>
              <div className="text-7xl text-white mb-3">+</div>
              <h2 className="text-2xl font-bold text-white text-center drop-shadow-lg px-6">
                Upgrade To
              </h2>
              {!selectedGift && (
                <p className="text-sm text-gray-500 mt-4 text-center px-8">
                  Select gift first
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {selectedGift && targetGift && (
        <p className="text-center text-yellow-400 font-bold text-lg mb-4">
          Win Chance: {calculateWinChance()}%
        </p>
      )}
      {selectedGift && targetGift && (
        <div className="flex flex-col items-center mb-10 w-full max-w-[440px] px-4">
          <h2 className="text-2xl font-bold mb-6 text-purple-300 drop-shadow-lg">
            Spin to Upgrade
          </h2>
          <div className="relative w-full max-w-[440px] mx-auto overflow-hidden">
            <div
              id="prize-strip-upgrade"
              className="flex items-center gap-6 transition-transform duration-[6800ms] ease-out"
              style={{ transform: 'translateX(0px)' }}
            >
              {generateStripItems(calculateWinChance()).map((type, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] flex justify-center py-2">
                  <span className={`text-8xl ${type === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {type === 'win' ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-[85%] -translate-x-1/2 z-20 pointer-events-none">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-white" />
            </div>
            <div className="absolute inset-x-0 top-1/2 h-[140px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#0a001a]/95 to-transparent pointer-events-none z-10" />
          </div>
          <button
            onClick={handleUpgradeGorilla}
            disabled={isSpinning}
            className={`mt-8 w-full py-6 rounded-3xl font-bold text-2xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.985] border-none ${
              isSpinning
                ? 'bg-gray-800 cursor-not-allowed text-gray-400'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isSpinning ? 'SPINNING...' : 'Upgrade'}
          </button>
        </div>
      )}
      {upgradeResult && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-gradient-to-br from-[#0f0f23] via-[#1a1625] to-[#0a001a] w-full max-w-[360px] rounded-3xl shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setUpgradeResult(null)}
              className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-red-400 transition"
            >
              ×
            </button>
            <div className="pt-8 pb-4 text-center">
              <h2 className={`text-4xl font-black tracking-tight text-transparent bg-clip-text drop-shadow-[0_0_20px_${upgradeResult.success ? '#10b981' : '#ef4444'}] ${upgradeResult.success ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400' : 'bg-gradient-to-r from-red-400 to-pink-500'}`}>
                {upgradeResult.success ? 'UPGRADE SUCCESS!' : 'UPGRADE FAILED!'}
              </h2>
            </div>
            <div className="flex justify-center px-6 pb-4">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br from-${upgradeResult.success ? 'purple' : 'red'}-500/30 to-cyan-500/30 rounded-[32px] blur-2xl`} />
                {upgradeResult.success ? (
                  <img
                    src={`/src/assets/${upgradeResult.gift.image}`}
                    alt={upgradeResult.gift.name}
                    className="w-48 h-48 object-contain relative drop-shadow-[0_0_40px_#a5f3fc] z-10"
                  />
                ) : (
                  <span className="text-8xl text-red-400 relative z-10">❌</span>
                )}
              </div>
            </div>
            <div className="px-6 text-center pb-6">
              <p className="text-2xl font-bold text-white tracking-tight mb-1">
                {upgradeResult.success ? upgradeResult.gift.name : 'Lost ' + selectedGift.name}
              </p>
              <p className="text-3xl font-black text-yellow-400 tracking-tighter flex items-center justify-center gap-2">
                ★ {upgradeResult.success ? upgradeResult.gift.value : 0}
              </p>
              {!upgradeResult.success && <p className="text-red-400 mt-2">Better luck next time!</p>}
            </div>
            <div className="px-6 pb-8 grid grid-cols-2 gap-4">
              <button className="py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985] text-white">
                Sell Instant
              </button>
              <button
                onClick={() => setUpgradeResult(null)}
                className={`py-4 ${upgradeResult.success ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110' : 'bg-gray-600'} rounded-2xl font-bold text-lg shadow-lg transition active:scale-[0.985]`}
              >
                {upgradeResult.success ? 'Collect Upgraded Gift' : 'OK'}
              </button>
            </div>
            <div className="text-center pb-5 text-xs text-purple-400/70">
              @Crazy_cases_bot
            </div>
          </div>
        </div>
      )}
      {showGiftModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-[#1a1625] rounded-3xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Select Gift to Upgrade</h2>
              <button onClick={() => setShowGiftModal(false)} className="text-4xl text-gray-400 hover:text-white transition">×</button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto">
              {userInventory.map((gift) => (
                <div
                  key={gift.id}
                  className="flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleSelectGift(gift)}
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0f0f0f] p-1 mb-2">
                    <img src={`/src/assets/${gift.image}`} alt={gift.name} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-tight mb-1">{gift.name}</p>
                  <p className="text-yellow-400 text-sm font-bold">★{gift.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowGiftModal(false)}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-3xl font-bold text-lg transition border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showTargetModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-[#1a1625] rounded-3xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Select Upgrade Level</h2>
              <button onClick={() => setShowTargetModal(false)} className="text-4xl text-gray-400 hover:text-white transition">×</button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto">
              {possibleTargets.map((target) => (
                <div
                  key={target.id}
                  className="flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleSelectTarget(target)}
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0f0f0f] p-1 mb-2">
                    <img src={`/src/assets/${target.image}`} alt={target.name} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-tight mb-1">{target.displayName}</p>
                  <p className="text-yellow-400 text-sm font-bold">★{target.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4">
              <button
                onClick={() => setShowTargetModal(false)}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-3xl font-bold text-lg transition border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <Link to="/" className="block mt-6 mb-8 text-center text-purple-400 hover:underline text-base">
        Back to Cases
      </Link>
    </div>
  );
}

function Raffles() {
  const leaderboard = [
    { rank: 1, username: '@CryptoKing', entries: 145, bonesUsed: 1450 },
    { rank: 2, username: '@StarHunter', entries: 98, bonesUsed: 980 },
    { rank: 3, username: '@MoonShot42', entries: 67, bonesUsed: 670 },
    { rank: 4, username: '@NFTWhale', entries: 52, bonesUsed: 520 },
    { rank: 5, username: 'You', entries: 12, bonesUsed: 120 },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[135px] pb-[135px] px-4 mx-auto flex flex-col items-center" style={appFont}>
      <LiveFeedBar />
      <div className="w-full max-w-[440px] mb-10">
        <img
          src="/src/assets/leaderboard.png"
          alt="Raffles Banner"
          className="w-full object-contain mx-auto drop-shadow-2xl"
        />
      </div>
      <h1 className="text-3xl font-bold text-center text-white mb-4">Raffles</h1>
      <p className="text-center text-gray-300 mb-10 max-w-md text-base">
        Use your <span className="text-yellow-400 font-bold">🦴 Crazy Bones</span> tickets to enter.<br />
        1 Bone = 1 entry — more bones = more chances to win exclusive NFTs and prizes!
      </p>
      <div className="w-full max-w-[440px] bg-[#1e1e2e] rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all mb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">Weekly Star Raffle</h3>
          <span className="text-yellow-400 font-semibold text-lg">★50,000 Pool</span>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-2xl overflow-hidden mb-3">
            <img src="/src/assets/5.png" alt="Raffle Prize" className="w-full h-full object-contain scale-125" />
          </div>
          <p className="text-lg font-bold text-white">Prize: Mystic Relic #5</p>
          <p className="text-yellow-400 text-base">★622 Value</p>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl">🦴</span>
          <div>
            <p className="text-gray-300 text-lg">
              Cost per entry: <span className="text-white font-bold">10 Crazy Bones</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              More entries = better odds!
            </p>
          </div>
        </div>
        <p className="text-gray-400 mb-6">
          Ends in 3 days. Win rare NFTs, high-value gifts, and massive star rewards.
        </p>
        <button className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95 shadow-lg">
          Join Raffle
        </button>
      </div>
      <div className="w-full max-w-[440px] bg-[#1e1e2e] rounded-3xl p-6 shadow-xl mb-12">
        <h3 className="text-2xl font-bold text-white text-center mb-6">Current Leaderboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead>
              <tr className="border-b border-purple-500/30">
                <th className="py-3 px-4 font-semibold text-white">Rank</th>
                <th className="py-3 px-4 font-semibold text-white">User</th>
                <th className="py-3 px-4 font-semibold text-white text-center">Entries</th>
                <th className="py-3 px-4 font-semibold text-white text-center">Bones Used</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.username}
                  className={`border-b border-gray-800/50 ${entry.username === 'You' ? 'bg-purple-900/20' : ''}`}
                >
                  <td className="py-4 px-4 font-bold text-purple-300">#{entry.rank}</td>
                  <td className="py-4 px-4 font-medium">{entry.username}</td>
                  <td className="py-4 px-4 text-center font-bold text-yellow-400">{entry.entries}</td>
                  <td className="py-4 px-4 text-center">{entry.bonesUsed} 🦴</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Updated live • Top 5 shown
        </p>
      </div>
      <div className="w-full max-w-[440px] mb-12">
        <h3 className="text-xl font-bold text-white text-center mb-8">How to Earn Crazy Bones 🦴</h3>
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-stretch">
          <div className="flex-1 flex flex-col items-center text-center">
            <p className="font-medium text-lg mb-3">Referral deposits</p>
            <p className="text-base text-gray-300 mb-6 min-h-[4rem]">
              Get <span className="font-bold text-yellow-400">30 🦴</span> for every successful referral who makes a deposit
            </p>
            <Link
              to="/profile"
              className="mt-auto bg-purple-600 hover:bg-purple-700 px-10 py-4 rounded-2xl font-bold text-white text-base transition shadow-lg active:scale-95 w-full max-w-[260px]"
            >
              Referral Link
            </Link>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <p className="font-medium text-lg mb-3">Deposit Stars or TON</p>
            <p className="text-base text-gray-300 mb-6 min-h-[4rem]">
              Get <span className="font-bold text-yellow-400">10 🦴</span> for every 100 Stars deposited into your account
            </p>
            <button
              className="mt-auto bg-purple-600 hover:bg-purple-700 px-10 py-4 rounded-2xl font-bold text-white text-base transition shadow-lg active:scale-95 w-full max-w-[260px]"
              onClick={() => { /* trigger deposit modal */ }}
            >
              Deposit Now
            </button>
          </div>
        </div>
      </div>
      <Link
        to="/"
        className="mt-12 text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors flex items-center justify-center gap-2"
      >
        ← Back to Cases
      </Link>
    </div>
  );
}

function Tasks() {
  const [taskStates, setTaskStates] = useState(
    Array(9).fill().map(() => ({ status: 'pending' }))
  );
  const tasks = [
    { id: 0, name: "Join official group chat", link: "https://t.me/CrazyCasesChat", type: "join", bonus: "+5 🦴" },
    { id: 1, name: "Join official Crazy Cases channel", link: "https://t.me/CrazyCasesOfficial", type: "join", bonus: "+5 🦴" },
    { id: 2, name: "Deposit first gift", type: "deposit", bonus: "+25 🦴" },
    { id: 3, name: "Share the app with 3 friends", type: "share", bonus: "+10 🦴" },
    { id: 4, name: "Boost the Telegram group chat", type: "boost", bonus: "+15 🦴" },
    { id: 5, name: "Invite 3 friends", type: "invite", bonus: "+10 🦴" },
    { id: 6, name: "Invite 10 friends", type: "invite", bonus: "+25 🦴" },
    { id: 7, name: "Invite 25 friends", type: "invite", bonus: "+50 🦴" },
    { id: 8, name: "Invite 100 friends", type: "invite", bonus: "+200 🦴" },
  ];
  const handleTaskAction = (index) => {
    setTaskStates((prev) => {
      const newStates = [...prev];
      const current = newStates[index].status;
      if (current === 'pending') newStates[index].status = 'checking';
      else if (current === 'checking') newStates[index].status = 'done';
      return newStates;
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[200px] pb-[135px] px-4 mx-auto flex flex-col items-center overflow-y-auto" style={appFont}>
      <LiveFeedBar />
      <div className="relative w-full max-w-[440px] mb-8">
        <img
          src="/src/assets/dog-nft-gifts.png"
          alt="Your dog chilling"
          className="absolute -top-20 left-1/2 -translate-x-1/2 z-10 w-32 h-32 object-contain drop-shadow-2xl pointer-events-none"
        />
      </div>
      <h1 className="text-3xl font-bold text-center text-white mb-4">Tasks</h1>
      <p className="text-center text-gray-300 mb-6 max-w-md text-base">
        Complete tasks to earn <span className="text-yellow-400 font-bold">🦴 Crazy Bones</span>!
      </p>
      <div className="w-full max-w-[440px] space-y-1.5 overflow-y-auto max-h-[calc(100vh-400px)]">
        {tasks.map((task, index) => {
          const status = taskStates[index].status;
          const isDone = status === 'done';
          return (
            <div
              key={task.id}
              className="flex items-center justify-between gap-4 py-3 px-4 hover:bg-[#1e1e2e]/30 transition-all rounded-lg"
            >
              <div className="flex flex-col flex-1">
                <p className={`text-base font-medium ${isDone ? 'text-gray-500' : 'text-white'}`}>
                  {task.name}
                </p>
                <p className={`text-sm ${isDone ? 'text-gray-600' : 'text-yellow-400'}`}>
                  {task.bonus}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {isDone ? (
                  <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">✓</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTaskAction(index)}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition ${
                      status === 'checking'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {status === 'checking' ? 'Check' : 'Complete'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Link
        to="/"
        className="mt-10 text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors flex items-center justify-center gap-2"
      >
        ← Back to Cases
      </Link>
    </div>
  );
}

function Leaderboard() {
  const leaderboard = Array.from({ length: 15 }, (_, i) => {
    const rank = i + 1;
    const randomGiftId = Math.floor(Math.random() * 60) + 1;
    return {
      rank,
      username: rank === 5 ? 'You' : `@Player${rank * 10 + Math.floor(Math.random() * 100)}`,
      points: Math.floor(150000 - i * 8000 + Math.random() * 5000),
      prizeImage: `${randomGiftId}.png`,
    };
  });
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[200px] pb-[135px] px-4 mx-auto flex flex-col items-center overflow-y-auto" style={appFont}>
      <LiveFeedBar />
      <h1 className="text-3xl font-bold text-center text-white mb-3">Leaderboard</h1>
      <p className="text-center text-gray-300 mb-10 max-w-md text-base">
        Ranked by total stars bet + deposited (1 point = 100 stars). Top players win exclusive NFTs!
      </p>
      <div className="w-full max-w-[440px] mb-16">
        <img
          src="/src/assets/trophy-pepe.png"
          alt="Pepe holding trophy"
          className="w-full object-contain mx-auto"
        />
      </div>
      <div className="w-full max-w-[440px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-4 px-4 font-semibold text-white">Rank</th>
                <th className="py-4 px-4 font-semibold text-white">Player</th>
                <th className="py-4 px-4 font-semibold text-white text-center">Points</th>
                <th className="py-4 px-4 font-semibold text-white text-center">Prize</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.username}
                  className={`border-b border-gray-800/50 ${entry.username === 'You' ? 'bg-purple-900/20 font-bold' : ''}`}
                >
                  <td className="py-4 px-4 font-bold text-center">
                    {entry.rank === 1 && <span className="text-yellow-400 text-xl">🏆</span>}
                    {entry.rank === 2 && <span className="text-gray-300 text-xl">🥈</span>}
                    {entry.rank === 3 && <span className="text-amber-700 text-xl">🥉</span>}
                    {entry.rank > 3 && entry.rank}
                  </td>
                  <td className="py-4 px-4">{entry.username}</td>
                  <td className="py-4 px-4 text-center font-bold text-yellow-400">
                    {entry.points.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-transparent">
                        <img
                          src={`/src/assets/${entry.prizeImage}`}
                          alt="Prize NFT"
                          className="w-full h-full object-contain scale-125"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          Updated live • Top 100 players shown
        </p>
      </div>
      <Link
        to="/"
        className="mt-12 text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors flex items-center justify-center gap-2"
      >
        ← Back to Cases
      </Link>
    </div>
  );
}

function Profile() {
  const invitedCount = 2;
  const earnedBones = 0;
  const referralLink = "https://t.me/crazy_cases_bot?start=ref_yourcode123";
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white pt-[220px] pb-[135px] px-4 mx-auto flex flex-col items-center overflow-y-auto" style={appFont}>
      <LiveFeedBar />
      <h1 className="text-3xl font-bold text-center text-white mb-6">Profile</h1>
      <div className="w-full max-w-[440px] bg-[#1e1e2e] rounded-3xl shadow-2xl overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            Invite friends and earn <span className="text-blue-400">10%</span> from their deposits!
          </h2>
          <p className="text-gray-300 text-center text-sm mb-6">
            Also get <span className="text-yellow-400">🦴5</span> for each, but no more than 30 per day
          </p>
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="bg-gray-700 rounded-full px-6 py-2 text-white font-bold text-lg">
                {invitedCount}
              </div>
              <p className="text-gray-400 text-xs mt-2">Invited</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-700 rounded-full px-6 py-2 text-white font-bold text-lg">
                {earnedBones}
              </div>
              <p className="text-gray-400 text-xs mt-2">Earned</p>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-2xl font-bold text-white text-base transition shadow-lg active:scale-95 flex-1">
              Invite
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 px-5 py-4 rounded-2xl font-bold text-white text-base transition shadow-lg active:scale-95">
              📋
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[440px] text-center mb-10">
        <h3 className="text-xl font-bold text-white mb-4">Your Gifts</h3>
        <p className="text-gray-400 mb-6">Nothing here yet</p>
        <button className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-2xl font-bold text-white text-base transition shadow-lg active:scale-95">
          + Add gift
        </button>
      </div>
      <Link
        to="/"
        className="mt-8 text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors flex items-center justify-center gap-2"
      >
        ← Back to Cases
      </Link>
      <BottomNav />
    </div>
  );
}

function Rolls() {
  const { round, loading, error, placeBet } = usePvpRound();
  const { user, loading: userLoading } = useTelegramUser();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [connecting, setConnecting] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [currentBet, setCurrentBet] = useState('');
  const [currency, setCurrency] = useState<'TON' | 'STARS'>('TON');
  const [clientTimeLeft, setClientTimeLeft] = useState(17);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [lockedRotation, setLockedRotation] = useState(0);
  const [hasSpunThisRound, setHasSpunThisRound] = useState(false);
  const wheelRef = useRef(null);
  const [depositCurrency, setDepositCurrency] = useState<'TON' | 'STARS'>('TON');
  const prevBetCountRef = useRef(0);
  const [lastRoundData, setLastRoundData] = useState(null);
  const [balance, setBalance] = useState({ TON: 0, STARS: 50 });
  const colorPalette = [
    '#8b5cf6', '#60a5fa', '#34d399', '#fbbf24',
    '#f472b6', '#22d3ee', '#a78bfa', '#facc15',
    '#ef4444', '#ec4899', '#14b8a6', '#eab308'
  ];
  useEffect(() => {
    if (!user?.uid) return;
    const id = user.uid.toString();
    db.users.get(id).then(existingUser => {
      if (existingUser) {
        setBalance({
          TON: existingUser.balanceTON || 0,
          STARS: existingUser.stars_balance || 50
        });
      } else {
        const newName = user.username || user.first_name || `Player${Math.floor(Math.random() * 9999)}`;
        db.users.add({
          id,
          username: newName,
          stars_balance: 50,
          balanceTON: 0,
          createdAt: new Date()
        });
        setBalance({ TON: 0, STARS: 50 });
      }
    });
  }, [user]);
  useEffect(() => {
    if (!user?.uid) return;
    db.users.update(user.uid.toString(), {
      stars_balance: balance.STARS,
      balanceTON: balance.TON
    });
  }, [balance, user]);
  useEffect(() => {
    if (!round || round.status !== 'betting' || !round.endTime) {
      setClientTimeLeft(17);
      return;
    }
    const endTimeMs = round.endTime.toMillis();
    const updateTimer = () => {
      const liveSeconds = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000));
      setClientTimeLeft(Math.min(17, liveSeconds));
      if (liveSeconds <= 0) endRound();
    };
    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [round?.endTime, round?.status]);
  const endRound = () => {
    if (!round || round.status !== 'betting' || hasSpunThisRound) return;
    const totalPotTon = round.potTON || 0;
    const bets = round.bets || [];
    if (totalPotTon <= 0 || bets.length === 0) return;
    let rand = Math.random() * totalPotTon;
    let winnerBet = null;
    for (const bet of bets) {
      const valueTon = bet.currency === 'TON' ? bet.amount : (bet.amount / 500 || 0);
      rand -= valueTon;
      if (rand <= 0) { winnerBet = bet; break; }
    }
    if (!winnerBet) winnerBet = bets[0];
    let cumulative = 0;
    const winnerIndex = bets.indexOf(winnerBet);
    for (let i = 0; i < winnerIndex; i++) {
      const valueTon = bets[i].currency === 'TON' ? bets[i].amount : (bets[i].amount / 500 || 0);
      cumulative += (valueTon / totalPotTon) * 360;
    }
    const finalAngle = cumulative + 180 + (Math.random() * 30 - 15);
    setFinalRotation(finalAngle + 9000);
    setIsSpinning(true);
    setHasSpunThisRound(true);
    setTimeout(() => {
      setIsSpinning(false);
      setLockedRotation(finalAngle + 9000);
      setTimeout(() => {
        setWinnerData(winnerBet);
        setShowWinnerPopup(true);
      }, 1000);
    }, 8000);
  };
  const handleAddBet = async () => {
    if (!user) {
      window.Telegram?.WebApp?.showAlert("Open from bot menu");
      return;
    }
    const amount = parseFloat(currentBet);
    if (isNaN(amount) || amount < 0.1) return alert('Minimum 0.1');
    const currentBalance = currency === 'TON' ? balance.TON : balance.STARS;
    if (currentBalance < amount) {
      return alert(`Not enough ${currency}! You have ${currentBalance.toFixed(2)} ${currency}`);
    }
    setBalance(prev => ({
      ...prev,
      [currency]: prev[currency] - amount
    }));
    try {
      await placeBet(user.uid, user.username || 'Player', amount, currency);
      alert(`Bet placed: ${amount} ${currency} deducted from balance!`);
    } catch (e) {
      setBalance(prev => ({
        ...prev,
        [currency]: prev[currency] + amount
      }));
      alert("Bet failed — balance restored");
    }
    setCurrentBet('');
  };
  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 0.1) return alert("Minimum 0.1");
    if (depositCurrency === 'TON') {
      if (!wallet) {
        await tonConnectUI.openModal();
        return;
      }
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [{
          address: "UQD6PcEuRJtzhRqzFfHIbEjJR2cSqQlurYHmhgapS6vCs1dQ",
          amount: (amt * 1_000_000_000).toString()
        }]
      };
      try {
        await tonConnectUI.sendTransaction(transaction);
        setBalance(prev => ({ ...prev, TON: prev.TON + amt }));
        alert(`Success! +${amt} TON deposited. Balance updated.`);
      } catch (e) {
        console.error(e);
        alert("Deposit failed: " + (e.message || "Unknown error"));
      }
    } else {
      alert("Telegram Stars coming soon — use TON for now");
    }
    setShowDepositModal(false);
    setDepositAmount('');
  };
  const displayRound = (isSpinning || showWinnerPopup) && lastRoundData ? lastRoundData : round;
  const players = displayRound?.bets || [];
  const pot = displayRound?.potTON?.toFixed(2) || '0.00';
  const totalPotTon = players.reduce((sum, p) => sum + (p.currency === 'TON' ? p.amount : (p.amount / 500 || 0)), 0) || 1;
  let cumulative = 0;
  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Connecting to Telegram...</div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white overflow-y-auto pb-20" style={appFont}>
      {connecting && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-purple-600 text-white text-center py-3 text-sm font-bold">
          Connecting real Telegram user...
        </div>
      )}
      <CustomHeader
        balance={balance}
        onDepositClick={() => setShowDepositModal(true)}
      />
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg h-14 flex items-center justify-center border-b border-purple-900/50">
        <h1 className="text-2xl font-bold">PVP ROLLS</h1>
      </div>
      <div className="pt-36 px-3 sm:px-4 max-w-[500px] mx-auto">
        <div className="text-center py-4 bg-[#1e1e2e]/50 border-b border-purple-500/30 mb-6">
          <p className="text-xl font-bold text-white">
            Balance: <span className="text-blue-400">{balance.TON.toFixed(2)} TON</span> /
            <span className="text-yellow-400">{balance.STARS} Stars</span>
          </p>
        </div>
        <div className="bg-[#1e1e2e] rounded-3xl p-6 mb-14 shadow-xl border border-purple-500/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 text-left min-w-[100px]">
              <div className="text-xs tracking-widest text-purple-400 font-medium">LAST ROLL</div>
              <div className="font-bold text-white text-xl mt-1">{lastRoundData?.winner?.username || '—'}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="inline-flex items-center gap-3">
                <span className="text-purple-400 text-sm tracking-widest font-medium">POT</span>
                <span className="text-4xl font-black text-white tracking-[-1px]">{pot}</span>
                <img src="/src/assets/ton.png" alt="TON" className="w-9 h-9 object-contain" />
              </div>
            </div>
            <div className="flex-1 text-right min-w-[100px]">
              <div className="text-xs tracking-widest text-purple-400 font-medium">TOP ROLL TODAY</div>
              <div className="font-bold text-white text-xl mt-1">{lastRoundData?.winner?.username || '—'}</div>
            </div>
          </div>
        </div>
        <div className="relative w-80 h-80 mb-8 mx-auto">
          <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-20 text-white text-6xl drop-shadow-2xl">▼</div>
          <div className="relative w-full h-full rounded-full overflow-hidden border-8 border-purple-600 shadow-2xl bg-black/70">
            {round?.status === 'betting' && !isSpinning && !showWinnerPopup && players.length > 0 && (
              <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="20.5" fill="none" stroke="#e0e7ff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 20.5} strokeDashoffset={2 * Math.PI * 20.5 * (1 - clientTimeLeft / 17)} className="transition-all duration-100 ease-linear" />
              </svg>
            )}
            <div ref={wheelRef} className="w-full h-full transition-transform duration-[8000ms] ease-out" style={{ transform: `rotate(${isSpinning ? finalRotation : lockedRotation}deg)` }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {totalPotTon > 0 && players.length > 0 ? players.map((player, i) => {
                  const betValueTon = player.currency === 'TON' ? player.amount : (player.amount / 500 || 0);
                  const percent = betValueTon / totalPotTon * 100;
                  const startAngle = cumulative;
                  cumulative += percent / 100 * 360;
                  const endAngle = cumulative;
                  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                  const x1 = 50 + 50 * Math.cos(startAngle * Math.PI / 180);
                  const y1 = 50 + 50 * Math.sin(startAngle * Math.PI / 180);
                  const x2 = 50 + 50 * Math.cos(endAngle * Math.PI / 180);
                  const y2 = 50 + 50 * Math.sin(endAngle * Math.PI / 180);
                  return <path key={i} d={`M50,50 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`} fill={colorPalette[i % colorPalette.length]} stroke="#111" strokeWidth="0.5" />;
                }) : <circle cx="50" cy="50" r="50" fill="#333344" />}
                <circle cx="50" cy="50" r="20" fill="#000" />
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            {isSpinning || showWinnerPopup ? null : players.length === 0 ? (
              <img src="/src/assets/logo.png" alt="Logo" className="w-28 h-28 object-contain drop-shadow-2xl" />
            ) : (
              <div className="text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.9)]">{clientTimeLeft < 10 ? '0' : ''}{clientTimeLeft}</div>
            )}
          </div>
        </div>
        <div className="mx-auto mb-8 overflow-x-hidden">
          <div className="inline-flex items-center bg-[#1e1e2e] rounded-3xl p-2.5 gap-1.5 flex-wrap justify-center mx-auto border border-purple-500/30 shadow-lg max-w-full">
            <button onClick={() => setCurrency('TON')} className={`p-2 rounded-2xl flex items-center justify-center min-w-[44px] ${currency === 'TON' ? 'bg-purple-600/20' : ''}`}>
              <img src="/src/assets/ton.png" alt="TON" className="w-8 h-8 object-contain" />
            </button>
            <button onClick={() => setCurrency('STARS')} className={`p-2 rounded-2xl flex items-center justify-center min-w-[44px] ${currency === 'STARS' ? 'bg-purple-600/20' : ''}`}>
              <img src="/src/assets/stars.png" alt="Stars" className="w-8 h-8 object-contain" />
            </button>
            <div className="bg-[#0f0f1a] rounded-3xl px-5 py-3 min-w-[110px]">
              <input
                type="number"
                value={currentBet}
                onChange={(e) => setCurrentBet(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-center text-2xl font-bold text-white w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button onClick={handleAddBet} className="px-7 py-3.5 rounded-3xl text-lg font-bold bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
              Bet
            </button>
            <button onClick={() => setShowDepositModal(true)} className="px-5 py-3.5 rounded-3xl text-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-black whitespace-nowrap">
              Deposit
            </button>
          </div>
        </div>
        <div className="w-full max-w-[500px] bg-[#1e1e2e] rounded-3xl p-6 mx-auto shadow-xl border border-purple-500/20">
          <h3 className="text-xl font-bold mb-4 text-center">Current Bets ({players.length})</h3>
          {players.length === 0 ? (
            <p className="text-gray-400 text-center">No bets yet – be the first!</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {players.map((bet, i) => {
                const betValueTon = bet.currency === 'TON' ? bet.amount : (bet.amount / 500 || 0);
                const playerPercent = totalPotTon > 0 ? (betValueTon / totalPotTon * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex justify-between items-center bg-[#0f0f1a] p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full" style={{ backgroundColor: colorPalette[i % colorPalette.length] }} />
                      <span className="font-medium">{bet.username}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-400">{bet.amount} {bet.currency}</span>
                      <span className="text-xs text-purple-400 ml-2">({playerPercent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showWinnerPopup && winnerData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000]">
          <div className="bg-gradient-to-br from-purple-900/90 to-black p-10 rounded-3xl text-center max-w-[90%] mx-auto border-4 border-purple-500 shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-400 mb-6">WINNER!</h2>
            <div className="text-3xl text-white mb-4" style={{ color: colorPalette[players.findIndex(p => p.telegramId === winnerData.telegramId) % colorPalette.length] }}>
              {winnerData.username}
            </div>
            <p className="text-2xl text-purple-300 mb-8">
              Won <span className="text-yellow-400 font-bold">{pot} TON</span>
            </p>
            <button onClick={() => setShowWinnerPopup(false)} className="bg-purple-600 hover:bg-purple-700 px-12 py-5 rounded-2xl text-2xl font-bold text-white transition-all">OK</button>
          </div>
        </div>
      )}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/90 z-[1000] flex items-end justify-center">
          <div className="bg-[#0f0f1a] w-full max-w-[500px] rounded-t-3xl p-8 pb-12 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black">Balance replenishment</h2>
              <button onClick={() => setShowDepositModal(false)} className="text-4xl text-gray-400">×</button>
            </div>
            <div className="flex bg-[#1e1e2e] rounded-3xl p-1 mb-8">
              <button onClick={() => setDepositCurrency('STARS')} className={`flex-1 py-3 rounded-3xl font-bold ${depositCurrency === 'STARS' ? 'bg-yellow-500 text-black' : 'text-white'}`}>Stars</button>
              <button onClick={() => setDepositCurrency('TON')} className={`flex-1 py-3 rounded-3xl font-bold ${depositCurrency === 'TON' ? 'bg-blue-600 text-white' : 'text-white'}`}>TON</button>
            </div>
            <div className="text-center mb-8">
              <div className="text-7xl font-black text-white">{depositAmount || '0'}</div>
              <div className="text-4xl text-purple-400">{depositCurrency}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {(depositCurrency === 'STARS' ? [500, 2000, 5000] : [1, 5, 10]).map((val) => (
                <button key={val} onClick={() => setDepositAmount((parseFloat(depositAmount) || 0) + val)} className="bg-[#1e1e2e] hover:bg-[#2a2a3a] py-4 rounded-2xl text-xl font-bold">+{val}</button>
              ))}
            </div>
            <div className="bg-[#1e1e2e] rounded-2xl p-6 mb-8">
              <input type="number" step="0.01" min="0.1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" className="bg-transparent text-5xl font-bold w-full text-center focus:outline-none text-white" />
            </div>
            <button onClick={handleDeposit} className={`w-full font-bold text-2xl py-6 rounded-3xl shadow-2xl ${depositCurrency === 'STARS' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>
              Top up
            </button>
            <p className="text-center text-gray-500 text-sm mt-6">Instant • Powered by Telegram</p>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.requestFullscreen();
      tg.setBackgroundColor('#0f0f0f');
      tg.setHeaderColor('#0f0f0f');
      tg.BackButton.show();
      tg.disableVerticalSwipes();
      const handleBack = () => navigate(-1);
      tg.onEvent('backButtonClicked', handleBack);
      const preventPull = (e) => {
        if (window.scrollY <= 0 && e.touches.length > 0) {
          const touchY = e.touches[0].clientY;
          const diffY = touchY - e.changedTouches[0].clientY;
          if (diffY < 0) e.preventDefault();
        }
      };
      document.addEventListener('touchmove', preventPull, { passive: false });
      return () => {
        tg.offEvent('backButtonClicked', handleBack);
        tg.BackButton.hide();
        document.removeEventListener('touchmove', preventPull);
      };
    }
  }, [navigate]);

  const hideBottomNavPaths = ['/roulette', '/free', '/crash', '/upgrade', '/crazy-chance', '/rolls'];
  const showBottomNav = !hideBottomNavPaths.includes(location.pathname);

  return (
    <ClientTonConnectProvider>
      <div className="relative min-h-screen w-full bg-gradient-to-b from-[#0f0f0f] via-[#0a001a] to-[#000000] text-white overflow-y-auto" style={appFont}>
        <CustomHeader isConnected={isConnected} balance="★47" onDepositClick={() => setShowDeposit(true)} />
        <LiveFeedBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/roulette" element={<Roulette />} />
          <Route path="/free" element={<Free />} />
          <Route path="/crash" element={<Crash />} />
          <Route path="/crazy-chance" element={<ComingSoon title="Crazy Chance" />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/raffles" element={<Raffles />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/rolls" element={<Rolls />} />
        </Routes>
        {showBottomNav && <BottomNav />}
        <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
      </div>
    </ClientTonConnectProvider>
  );
}

// Root render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);

export default App;