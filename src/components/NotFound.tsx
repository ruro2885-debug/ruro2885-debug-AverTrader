import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Key } from 'lucide-react';
import { useAppNavigation } from '../contexts/NavigationContext';

interface NotFoundProps {
  theme: 'light' | 'dark';
  onBack: () => void;
  onAdminAccess?: () => void;
}

export default function NotFound({ theme, onBack, onAdminAccess }: NotFoundProps) {
  const { navigateToView } = useAppNavigation() as any;
  const isDark = theme === 'dark';
  const [tapCount, setTapCount] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSecretTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount >= 6) {
      setShowAuth(true);
      setTapCount(0);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = password.trim();
    if (code === 'Ruro2008$' || code === 'Ruro2008') {
      localStorage.setItem('admin_session_active', 'true');
      if (navigateToView) {
        navigateToView('admin');
      } else if (onAdminAccess) {
        onAdminAccess();
      }
    } else {
      setError('Invalid credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <div className="max-w-md w-full text-center">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            <motion.div
              key="404"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 
                onClick={handleSecretTap}
                className="text-9xl font-black mb-4 cursor-pointer select-none"
              >
                404
              </h1>
              <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
              <p className={`mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                The page you are looking for does not exist.
              </p>
              <button
                onClick={onBack}
                className={`px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 mx-auto ${
                  isDark ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center justify-center gap-2">
                <Key className="w-5 h-5" />
                Verification Required
              </h3>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter code..."
                  className={`w-full p-3 rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'
                  }`}
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold">
                  Authenticate
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
