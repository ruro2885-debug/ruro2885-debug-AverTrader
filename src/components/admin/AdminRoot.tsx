import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Home, Search, Shield, Bot, Lock, Key, Cpu, RefreshCw } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { db, auth } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppNavigation } from '../../contexts/NavigationContext';

export default function AdminRoot({ theme }: { theme: 'light' | 'dark' }) {
  const { navigateToView } = useAppNavigation() as any;
  const [showAdmin, setShowAdmin] = useState(false); // Default to false, check session in useEffect
  const [clickCount, setClickCount] = useState(0);
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [promoting, setPromoting] = useState(false);

  const isDark = theme === 'dark';

  // Hidden gesture: Click the 404 header 6 times
  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 6) {
      setShowAccessPrompt(true);
      setClickCount(0);
    }
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCode.trim();
    if (code === 'Ruro2008$' || code === 'Ruro2008') {
      localStorage.setItem('admin_session_active', 'true');
      
      // Automatic Role Promotion for the current logged in user
      if (auth.currentUser) {
        try {
          setPromoting(true);
          const userRef = doc(db, 'users', auth.currentUser.uid);
          // Use setDoc with merge:true instead of updateDoc to ensure it works even if doc is missing
          await setDoc(userRef, {
            role: 'super_admin',
            isAdmin: true,
            isSuperAdmin: true,
            lastAdminAccess: serverTimestamp(),
            // Ensure essential fields exist if creating for the first time
            email: auth.currentUser.email || '',
            uid: auth.currentUser.uid
          }, { merge: true });
          console.log("[AdminRoot] Role promoted to super_admin successfully.");
        } catch (err) {
          console.error("[AdminRoot] Failed to promote role during terminal authentication:", err);
          // We still show admin because they have the code, but they might face DB errors
        } finally {
          setPromoting(false);
        }
      }

      setShowAdmin(true);
      setShowAccessPrompt(false);
      
      // Force App.tsx to re-evaluate routing
      if (navigateToView) {
        navigateToView('admin');
      }
    } else {
      setError('Invalid access credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem('admin_session_active');
    if (session === 'true') {
      setShowAdmin(true);
    }
  }, []);

  useEffect(() => {
    // Sovereign Admin setup: purge user translation cookies & force English
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    if (window.location.hostname !== 'localhost') {
      const domainParts = window.location.hostname.split('.');
      if (domainParts.length > 2) {
        const rootDomain = domainParts.slice(-2).join('.');
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${rootDomain}; path=/;`;
      }
    }

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select && select.value !== 'en') {
      select.value = 'en';
      select.dispatchEvent(new Event('change'));
    }
  }, []);

  if (showAdmin) {
    return (
      <div className="notranslate" translate="no">
        <AdminLayout theme={theme} onLogout={() => {
          localStorage.removeItem('admin_session_active');
          setShowAdmin(false);
        }} />
      </div>
    );
  }

  return (
    <div className={`notranslate min-h-screen flex items-center justify-center p-6 relative overflow-hidden ${isDark ? 'bg-[#05080c] text-white' : 'bg-slate-50 text-slate-900'}`} translate="no">
      {/* Background Decorative Elements matching the image's "cube" aesthetic */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2000&auto=format&fit=crop')] bg-cover opacity-10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
      </div>

      <AnimatePresence mode="wait">
        {!showAccessPrompt ? (
          <motion.div 
            key="404"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl w-full text-center relative z-10"
          >
            <div className="relative inline-block mb-8 select-none group">
              <div 
                onClick={handleLogoClick}
                className="absolute inset-0 z-20 cursor-pointer touch-none"
                title="Institutional Access Point"
              />
              <h1 
                className={`text-[180px] md:text-[240px] font-black leading-none tracking-tighter transition-all relative z-10 ${
                  isDark ? 'text-white/[0.03]' : 'text-slate-900/[0.03]'
                }`}
                style={{ 
                  WebkitTextStroke: isDark ? '2px rgba(255,255,255,0.05)' : '2px rgba(15,23,42,0.05)',
                  paintOrder: 'stroke fill'
                }}
              >
                404
                
                {/* Visual Pulse on each tap */}
                <AnimatePresence mode="popLayout">
                  {clickCount > 0 && (
                    <motion.div
                      key={clickCount}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 0.15 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl -z-10"
                    />
                  )}
                </AnimatePresence>
              </h1>
              
              {/* Progress Indicator */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 transition-opacity duration-500" style={{ opacity: clickCount > 0 ? 1 : 0 }}>
                {[...Array(6)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    initial={false}
                    animate={{ 
                      scale: i < clickCount ? 1.2 : 1,
                      backgroundColor: i < clickCount ? '#10b981' : 'rgba(100, 116, 139, 0.2)',
                      boxShadow: i < clickCount ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'
                    }}
                    className="w-2 h-2 rounded-full" 
                  />
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className={`text-4xl md:text-5xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Page Not Found</h2>
              <p className={`text-lg mb-12 max-w-md mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  <Home className="w-5 h-5" />
                  <span>Back to Home</span>
                </button>
                <button className={`w-full sm:w-auto px-8 py-4 font-black rounded-2xl flex items-center justify-center gap-3 transition-all border ${
                  isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm'
                }`}>
                  <Search className="w-5 h-5" />
                  <span>Help Center</span>
                </button>
              </div>
            </motion.div>

            <div className="pt-20 flex justify-center items-center gap-8 opacity-20">
              <Shield className="w-6 h-6" />
              <Cpu className="w-6 h-6" />
              <Lock className="w-6 h-6" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="access"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm mx-auto p-8 rounded-3xl border shadow-2xl relative z-20 ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Key className="w-8 h-8" />
              </div>
            </div>

            <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>System Authentication</h3>
            <p className={`text-xs text-center mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter institutional credentials to proceed.
            </p>

            <form onSubmit={handleAccessSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Access Code</label>
                <input 
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter password..."
                  className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                    isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-rose-500 text-[10px] font-bold text-center"
                >
                  {error}
                </motion.p>
              )}

              <button 
                type="submit"
                disabled={promoting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {promoting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Configuring Permissions...</span>
                  </>
                ) : (
                  <span>Authenticate Terminal</span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setShowAccessPrompt(false)}
                className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
