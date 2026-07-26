// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Play, Coins, Ticket, User, AlertCircle, Video, X, Trophy, History, CheckCircle2, LogOut, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// --- KONFIGURASI FIREBASE ANDA ---
// Ganti bagian ini nanti dengan API Key dari console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyCep9qVX98VmUMgzBdAUvYjhSo0KqLqdFo",
  authDomain: "faucet-rupiah.firebaseapp.com",
  projectId: "faucet-rupiah",
  storageBucket: "faucet-rupiah.firebasestorage.app",
  messagingSenderId: "467404311048",
  appId: "1:467404311048:web:a56c8f0163a015f1f0dfbd",
  measurementId: "G-8DJE68M8HD"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase Init Error:", error);
}

const PRIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70, 80, 90, 100, 1000, 10000];
const WEIGHTS = PRIZES.map(p => Math.max(1, Math.floor(100000 / p)));
const TOTAL_WEIGHT = WEIGHTS.reduce((acc, val) => acc + val, 0);
const SLICE_ANGLE = 360 / PRIZES.length;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userData, setUserData] = useState({ balance: 0, tickets: 0 });
  const [firebaseError, setFirebaseError] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adFinished, setAdFinished] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!db) { setFirebaseError(true); return; }
    const savedUser = localStorage.getItem('faucet_session');
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;
    const docRef = doc(db, 'faucet_users', currentUser);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        handleLogout();
      }
    }, (error) => {
      setFirebaseError(true);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (formUsername.length < 4 || formPassword.length < 4) return setAuthError('Minimal 4 karakter!');
    setAuthLoading(true);
    try {
      const docRef = doc(db, 'faucet_users', formUsername.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAuthError('ID sudah terpakai.');
      } else {
        await setDoc(docRef, { username: formUsername.toLowerCase(), password: formPassword, balance: 0, tickets: 0, joinedAt: serverTimestamp() });
        localStorage.setItem('faucet_session', formUsername.toLowerCase());
        setCurrentUser(formUsername.toLowerCase());
      }
    } catch (error) {
      setAuthError('Gagal mendaftar. Pastikan Rules Firestore sudah benar (allow read, write: if true).');
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const docRef = doc(db, 'faucet_users', formUsername.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setAuthError('ID tidak ditemukan!');
      } else {
        if (docSnap.data().password === formPassword) {
          localStorage.setItem('faucet_session', formUsername.toLowerCase());
          setCurrentUser(formUsername.toLowerCase());
        } else {
          setAuthError('Password salah!');
        }
      }
    } catch (error) {
      setAuthError('Gagal login.');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => { localStorage.removeItem('faucet_session'); setCurrentUser(null); setFormUsername(''); setFormPassword(''); };
  const showNotification = (msg, type = 'info') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const startAd = () => { 
  // BUKA IKLAN DI TAB BARU
  window.open("https://www.effectivecpmnetwork.com/cvfeybzes4?key=1135154a38f4208f69b6ba63b3dda816", "_blank");

  // MULAI HITUNG MUNDUR DI WEB ANDA
  setShowAd(true); 
  setAdTimer(5); 
  setAdFinished(false); 
};

  useEffect(() => {
    let interval = null;
    if (showAd && adTimer > 0) interval = setInterval(() => setAdTimer(prev => prev - 1), 1000);
    else if (showAd && adTimer === 0) setAdFinished(true);
    return () => { if(interval) clearInterval(interval); };
  }, [showAd, adTimer]);

  const claimAdReward = async () => {
    if (!currentUser || !db) return;
    setShowAd(false); showNotification("+1 Tiket didapatkan!", "success");
    await updateDoc(doc(db, 'faucet_users', currentUser), { tickets: increment(1) }).catch(console.error);
  };

  const handleSpin = async () => {
    if (isSpinning || userData.tickets <= 0 || !currentUser || !db) return;
    setIsSpinning(true); setWonPrize(null);
    const docRef = doc(db, 'faucet_users', currentUser);
    try { await updateDoc(docRef, { tickets: increment(-1) }); } catch (err) { setIsSpinning(false); return; }

    let random = Math.random() * TOTAL_WEIGHT;
    let targetIndex = 0;
    for (let i = 0; i < PRIZES.length; i++) { if (random < WEIGHTS[i]) { targetIndex = i; break; } random -= WEIGHTS[i]; }
    
    const prizeAmount = PRIZES[targetIndex];
    const targetAngle = 360 - (targetIndex * SLICE_ANGLE);
    const spinsNeeded = (360 * 8) + targetAngle + ((Math.random() - 0.5) * (SLICE_ANGLE * 0.7)) - (rotation % 360);
    setRotation(rotation + spinsNeeded);

    setTimeout(async () => {
      setWonPrize(prizeAmount); setIsSpinning(false);
      await updateDoc(docRef, { balance: increment(prizeAmount) }).catch(console.error);
    }, 5000);
  };

  if (firebaseError) return <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center"><AlertCircle size={60} className="text-red-500 mb-4" /><h1 className="text-2xl font-bold mb-2">Konfigurasi Firebase Belum Diisi</h1></div>;

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <Trophy className="text-yellow-500 mb-2" size={48} /><h1 className="font-bold text-3xl text-white">Faucet<span className="text-blue-500">Spin</span></h1>
        </div>
        {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm mb-6">{authError}</div>}
        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2">USERNAME / ID</label>
            <input type="text" required value={formUsername} onChange={(e) => setFormUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3" />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2">PASSWORD</label>
            <input type="password" required value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3" />
          </div>
          <button type="submit" disabled={authLoading} className="w-full bg-blue-600 p-3 rounded-xl font-bold mt-4">{authMode === 'login' ? 'MASUK' : 'BUAT AKUN'}</button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          {authMode === 'login' ? <p>Belum punya? <button onClick={() => setAuthMode('register')} className="text-blue-400">Daftar</button></p> : <p>Sudah punya? <button onClick={() => setAuthMode('login')} className="text-blue-400">Login</button></p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 p-4 flex justify-between">
        <h1 className="font-bold text-xl flex gap-2"><Trophy className="text-yellow-500"/> FaucetSpin</h1>
        <div className="flex gap-2 text-sm items-center">
           <span className="bg-slate-800 px-2 py-1 rounded flex gap-1"><Coins size={16} className="text-yellow-400"/> {userData.balance}</span>
           <span className="bg-slate-800 px-2 py-1 rounded flex gap-1"><Ticket size={16} className="text-green-400"/> {userData.tickets}</span>
           <button onClick={handleLogout} className="text-red-400 px-2"><LogOut size={18}/></button>
        </div>
      </nav>
      <main className="max-w-md mx-auto px-4 mt-8 flex flex-col items-center gap-8">
        <button onClick={startAd} disabled={isSpinning || showAd} className="w-full flex items-center justify-center gap-2 bg-blue-600 p-4 rounded-xl font-bold"><Video/> Tonton Iklan (+1 Tiket)</button>
        
        <div className="w-72 h-72 rounded-full border-8 border-slate-800 bg-slate-900 overflow-hidden relative flex justify-center mt-4">
          <div className="absolute -top-1 z-20 text-red-500"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22L2 2h20L12 22z" /></svg></div>
          <div className="w-full h-full rounded-full relative" style={{ transition: isSpinning ? 'transform 5s cubic-bezier(0.2, 0.8, 0.1, 1)' : 'none', transform: `rotate(${rotation}deg)` }}>
            {PRIZES.map((prize, i) => (
              <div key={i} className="absolute inset-0 flex justify-center pointer-events-none" style={{ transform: `rotate(${i * SLICE_ANGLE}deg)` }}>
                <div className="absolute top-0 bottom-1/2 w-[1px] bg-slate-700/50 left-1/2 rotate-[8.57deg]"></div>
                <span className={`pt-4 text-xs font-black z-10 ${prize >= 1000 ? 'text-yellow-400' : 'text-slate-300'}`}>{prize}</span>
              </div>
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 rounded-full border-2 border-slate-700 z-20"></div>
          </div>
        </div>

        <button onClick={handleSpin} disabled={isSpinning || userData.tickets <= 0} className="w-full bg-yellow-500 text-black p-4 rounded-full font-black text-lg disabled:bg-slate-700">SPIN SEKARANG</button>
      </main>

      {showAd && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 text-center">
          <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-sm">
            {!adFinished ? <><h3 className="text-xl mb-4">Iklan Berjalan...</h3><div className="text-5xl text-blue-500">{adTimer}</div></> : <><h3 className="text-xl mb-4 text-green-400">Selesai!</h3><button onClick={claimAdReward} className="bg-green-600 p-3 rounded-xl w-full">Klaim Tiket</button></>}
          </div>
        </div>
      )}
      {wonPrize !== null && !isSpinning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 text-center">
          <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-sm border-2 border-yellow-500">
            <h2 className="text-2xl mb-4">Selamat!</h2><div className="text-5xl text-yellow-400 mb-6">+{wonPrize}</div>
            <button onClick={() => setWonPrize(null)} className="bg-slate-800 p-3 rounded-xl w-full">Tutup</button>
          </div>
        </div>
      )}
      {notification && <div className="fixed bottom-4 right-4 bg-slate-800 p-4 rounded-lg z-50">{notification.msg}</div>}
    </div>
  );
}
