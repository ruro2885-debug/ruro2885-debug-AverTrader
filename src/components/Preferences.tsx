import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronRight, CheckCircle2, Fingerprint, RefreshCw, Loader2 } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAppNavigation } from '../contexts/NavigationContext';

export default function Preferences({ theme, onBack }: { theme: 'light' | 'dark', onBack: () => void }) {
  const { preferences, updatePreference, resetPreferences, t } = usePreferences();
  const { registerOverlay } = useAppNavigation();
  const isDark = theme === 'dark';
  const [view, setView] = useState<'main' | 'currency' | 'language'>('main');
  const [tempCurrency, setTempCurrency] = useState(preferences.currency);
  const [tempLanguage, setTempLanguage] = useState(preferences.language);

  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog state
  const [dialog, setDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    type?: 'default' | 'danger';
  }>({
    show: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (view !== 'main') {
      return registerOverlay('preferences-subview', () => {
        setView('main');
      });
    }
  }, [view, registerOverlay]);

  useEffect(() => {
    if (dialog.show) {
      return registerOverlay('preferences-dialog', () => {
        setDialog(prev => ({ ...prev, show: false }));
      });
    }
  }, [dialog.show, registerOverlay]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApplyCurrency = () => {
    setIsLoading(true);
    try {
        // Simulate network delay
        setTimeout(() => {
            updatePreference('currency', tempCurrency);
            showToast(t('pref.updated'));
            setIsLoading(false);
            setView('main');
        }, 1500);
    } catch (error) {
        showToast(t('pref.error'));
        setIsLoading(false);
    }
  };

  const handleApplyLanguage = () => {
    setIsLoading(true);
    try {
        // Simulate network delay
        setTimeout(() => {
            updatePreference('language', tempLanguage);
            showToast(t('pref.updated'));
            setIsLoading(false);
            setView('main');
        }, 1500);
    } catch (error) {
        showToast(t('pref.error'));
        setIsLoading(false);
    }
  };

  const handleToggle = (key: 'rememberMeEnabled' | 'biometricsEnabled', value: boolean) => {
    if (key === 'biometricsEnabled' && value) {
        // Check for device support (simulated)
        const supportsBiometrics = true; // In a real app, we'd use WebAuthn or similar

        if (!supportsBiometrics) {
            showToast("Biometric authentication is not available on this device.");
            return;
        }

        setDialog({
            show: true,
            title: 'Enable Biometric Login?',
            message: 'Use your device’s biometric authentication to sign in faster on this device.',
            confirmLabel: 'Enable',
            type: 'default',
            onConfirm: async () => {
                // Request permission (simulated)
                const permissionGranted = true; // Simulating successful device auth
                
                if (permissionGranted) {
                    updatePreference(key, true);
                    showToast("Biometric Login enabled.");
                } else {
                    showToast("Biometric permission was not granted.");
                }
                setDialog(prev => ({ ...prev, show: false }));
            }
        });
        return;
    }
    
    if (key === 'biometricsEnabled' && !value) {
        updatePreference(key, false);
        showToast("Biometric Login disabled.");
        return;
    }

    if (key === 'rememberMeEnabled') {
        updatePreference(key, value);
        showToast(`Remember Me ${value ? 'enabled' : 'disabled'}.`);
        return;
    }
  };

  const handleReset = () => {
    setDialog({
        show: true,
        title: 'Reset Preferences',
        message: 'This will restore all preference settings to their default values. This action cannot be undone automatically.',
        confirmLabel: 'Reset',
        type: 'danger',
        onConfirm: () => {
            resetPreferences();
            setTempCurrency('USD');
            setTempLanguage('EN');
            showToast("Preferences restored successfully.");
            setDialog(prev => ({ ...prev, show: false }));
        }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen w-full relative z-10 ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} font-sans`}>
      <AnimatePresence mode="wait">
        {view === 'main' && (
          <motion.div key="main" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
            <header className="flex items-center gap-4 mb-8 pt-5 px-5">
              <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft /></button>
              <div>
                <h1 className="text-2xl font-bold">{t('common.preferences')}</h1>
                <p className="text-sm text-gray-500">Personalize how Aver works for you.</p>
              </div>
            </header>
            <div className="space-y-6 px-5 max-w-2xl mx-auto">
              <section className={`rounded-3xl border ${isDark ? 'border-white/10' : 'border-slate-200'} bg-white/5 overflow-hidden`}>
                  <button onClick={() => setView('currency')} className="w-full flex items-center justify-between p-4 border-b border-white/5 text-left hover:bg-white/5">
                    <div><div className="font-bold">{t('common.display_currency')}</div><div className="text-xs text-gray-400">{preferences.currency}</div></div>
                    <ChevronRight className="text-gray-500" />
                  </button>
                  <button onClick={() => setView('language')} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5">
                    <div><div className="font-bold">{t('common.lang')}</div><div className="text-xs text-gray-400">{preferences.language}</div></div>
                    <ChevronRight className="text-gray-500" />
                  </button>
              </section>
              <section className={`rounded-3xl border ${isDark ? 'border-white/10' : 'border-slate-200'} bg-white/5 overflow-hidden`}>
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div><div className="font-bold">{t('common.remember_me')}</div><div className="text-xs text-gray-400">{preferences.rememberMeEnabled ? "You’ll stay signed in." : "You'll need to sign in again."}</div></div>
                    <button onClick={() => handleToggle('rememberMeEnabled', !preferences.rememberMeEnabled)} className={`w-11 h-6 rounded-full transition-colors ${preferences.rememberMeEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}><div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.rememberMeEnabled ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                </div>
                <div className="flex items-center justify-between p-4">
                    <div><div className="font-bold">Biometric Login</div><div className="text-xs text-gray-400">Face ID, Touch ID, or fingerprint.</div></div>
                    <button onClick={() => handleToggle('biometricsEnabled', !preferences.biometricsEnabled)} className={`w-11 h-6 rounded-full transition-colors ${preferences.biometricsEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}><div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.biometricsEnabled ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                </div>
              </section>
              <button onClick={handleReset} className="w-full text-red-400 font-bold p-4 hover:bg-red-500/10 rounded-3xl border border-red-500/20 flex items-center justify-center gap-2"><RefreshCw size={18} />Reset Preferences</button>
            </div>
          </motion.div>
        )}

        {view === 'currency' && (
          <motion.div key="currency" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="pb-32">
            <header className="flex items-center gap-4 mb-8 pt-5 px-5">
              <button onClick={() => setView('main')} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft /></button>
              <div>
                <h1 className="text-2xl font-bold">{t('common.display_currency')}</h1>
                <p className="text-sm text-gray-500">Choose which currency Aver should use when displaying balances, deposits, withdrawals, profits and portfolio values.</p>
              </div>
            </header>
            <div className="px-5 space-y-3 max-w-2xl mx-auto">
              {[
                { label: 'USD', symbol: '$' },
                { label: 'EUR', symbol: '€' },
                { label: 'GBP', symbol: '£' },
                { label: 'BTC', symbol: '₿' }
              ].map(opt => (
                <button 
                  key={opt.label}
                  onClick={() => setTempCurrency(opt.label as any)}
                  className={`w-full p-4 flex items-center justify-between rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'} ${tempCurrency === opt.label ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <span className="font-bold">{opt.label} ({opt.symbol})</span>
                  {tempCurrency === opt.label && <CheckCircle2 className="text-emerald-500" />}
                </button>
              ))}
            </div>
            <div className="fixed bottom-20 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent">
              <button 
                onClick={handleApplyCurrency}
                disabled={isLoading || tempCurrency === preferences.currency}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${tempCurrency === preferences.currency ? 'bg-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                <span>{isLoading ? t('common.saving') : (tempCurrency === preferences.currency ? "No Changes" : t('common.apply_changes'))}</span>
              </button>
            </div>
          </motion.div>
        )}

        {view === 'language' && (
          <motion.div key="language" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="pb-32">
            <header className="flex items-center gap-4 mb-8 pt-5 px-5">
              <button onClick={() => setView('main')} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft /></button>
              <div><h1 className="text-2xl font-bold">{t('common.lang')}</h1></div>
            </header>
            <div className="px-5 space-y-3 max-w-2xl mx-auto">
              {[
                { label: 'English', value: 'EN' },
                { label: 'French', value: 'FR' },
                { label: 'Spanish', value: 'ES' },
                { label: 'German', value: 'DE' },
                { label: 'Portuguese', value: 'PT' }
              ].map(opt => (
                <button 
                  key={opt.value}
                  onClick={() => setTempLanguage(opt.value as any)}
                  className={`w-full p-4 flex items-center justify-between rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'} ${tempLanguage === opt.value ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <span className="font-bold">{opt.label}</span>
                  {tempLanguage === opt.value && <CheckCircle2 className="text-emerald-500" />}
                </button>
              ))}
            </div>
            <div className="fixed bottom-20 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent">
              <button 
                onClick={handleApplyLanguage}
                disabled={isLoading || tempLanguage === preferences.language}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${tempLanguage === preferences.language ? 'bg-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                <span>{isLoading ? t('common.saving') : (tempLanguage === preferences.language ? "No Changes" : t('common.apply_changes'))}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialog.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDialog(prev => ({ ...prev, show: false }))} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={`relative w-full max-w-sm rounded-[32px] p-8 border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'} shadow-2xl overflow-hidden`}>
                <div className="flex flex-col items-center text-center space-y-4">
                    {dialog.type === 'danger' ? (
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                            <RefreshCw size={32} className="animate-spin-slow" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                            <Fingerprint size={32} />
                        </div>
                    )}
                    
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{dialog.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dialog.message}</p>
                    
                    <div className="grid grid-cols-2 gap-3 w-full pt-4">
                        <button onClick={() => setDialog(prev => ({ ...prev, show: false }))} className={`py-4 rounded-2xl font-bold text-sm transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                            Cancel
                        </button>
                        <button onClick={dialog.onConfirm} className={`py-4 rounded-2xl font-bold text-sm transition-all ${dialog.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'} text-white`}>
                            {dialog.confirmLabel}
                        </button>
                    </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-24 left-5 right-5 bg-emerald-500 text-white p-4 rounded-xl font-bold text-center shadow-lg z-50">
          {toast}
        </motion.div>
      )}
    </motion.div>
  );
}
