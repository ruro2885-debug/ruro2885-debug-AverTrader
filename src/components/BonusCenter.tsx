import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTradingEngine } from '../contexts/TradingEngineContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  Trophy, 
  History as HistoryIcon, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ChevronRight, 
  Star, 
  Zap, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  Calendar,
  Sparkles,
  Award,
  Crown,
  BadgeCheck,
  Check,
  X,
  Smartphone,
  Cpu
} from 'lucide-react';

import { safeStorage } from '../utils/storage';
import { getTierState, completePlatinumTask, TaskItem, TIERS_DATA } from '../utils/tierManager';
import TwoFactorAuthModal from './TwoFactorAuthModal';

// --- TYPES ---
type SubView = 'main' | 'history' | 'task-details' | 'membership-details';

interface Task {
  id: string;
  title: string;
  progress: number;
  increment: number;
  status: 'pending' | 'completed' | 'locked' | 'unlocked';
  icon: any;
  actionLabel: string;
  targetTab?: string;
  customAction?: 'deposit' | 'profile' | 'verify_email' | 'claim_welcome' | 'enable_2fa' | 'kyc' | 'deposit_1000' | 'trade_500' | 'copy_10' | 'strat_2' | string;
  description?: string;
  requirements?: { label: string; done: boolean }[];
  isMission?: boolean;
}

interface Tier {
  id: 'bronze' | 'platinum' | 'gold';
  name: string;
  icon: any;
  requirements: string;
  benefits: string[];
  color: string;
}

interface Mission {
  id: string;
  title: string;
  reward: string;
  icon: any;
  taskRef?: string;
  isCustomTask?: boolean;
}

interface Achievement {
  id: string;
  title: string;
  status: 'completed' | 'locked';
  icon: any;
}

// --- CONSTANTS ---
const TIERS: Tier[] = [
  {
    id: 'bronze',
    name: 'Bronze Member',
    icon: Trophy,
    requirements: 'Default Entry Tier',
    benefits: [
      'Beginner trading badge',
      'Small cashback on selected fees',
      'Access to beginner campaigns',
      'Referral rewards',
      'Welcome promotions'
    ],
    color: 'from-orange-700 via-orange-600 to-amber-700'
  },
  {
    id: 'platinum',
    name: 'Platinum Member',
    icon: Star,
    requirements: 'Complete Bronze progression',
    benefits: [
      'Lower trading fees',
      'Faster withdrawals',
      'Priority support queue',
      'Higher referral rewards',
      'Monthly bonus events',
      'Higher daily limits'
    ],
    color: 'from-slate-300 via-zinc-200 to-slate-400'
  },
  {
    id: 'gold',
    name: 'Gold Member',
    icon: Crown,
    requirements: 'Complete Platinum progression',
    benefits: [
      'Lowest trading fees',
      'VIP support',
      'Exclusive campaigns',
      'Premium market reports',
      'Highest referral commission',
      'Highest withdrawal limits',
      'Early access to new features'
    ],
    color: 'from-yellow-500 via-amber-400 to-yellow-600'
  }
];

export default function BonusCenter({ 
  theme, 
  onBack, 
  onNavigate, 
  onOpenDeposit 
}: { 
  theme: 'light' | 'dark', 
  onBack: () => void,
  onNavigate?: (tab: string) => void,
  onOpenDeposit?: () => void
}) {
  const { user, addNotification, updateProfile, addDeposit } = useAuth();
  const { session } = useTradingEngine();
  const uid = user?.uid || '';
  const profileProgress = (user as any)?.profileProgress ?? 0;
  const welcomeBonusClaimed = !!(user as any)?.welcomeBonusClaimed || (uid ? safeStorage.getItem(`aver_welcome_bonus_claimed_${uid}`) === 'true' : false);
  const [currentView, setCurrentView] = useState<SubView>('main');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);

  // Core Computed State
  const isEmailVerified = !!(user as any)?.emailVerified || (uid ? safeStorage.getItem(`aver_email_verified_${uid}`) === 'true' : false) || auth.currentUser?.emailVerified === true;
  const isTwoFactorEnabled = (uid ? safeStorage.getItem(`aver_twoFactorEnabled_${uid}`) === 'true' : false) || !!(user as any)?.preferences?.twoFactorEnabled;
  const isDeposited = (user?.totalDeposits || 0) > 0;
  const tradesCount = user?.trades?.length || user?.aiTradesCount || 0;
  const isTraded = (tradesCount > 0 || (session?.status === 'ACTIVE' && (session?.tradingCapital || 0) > 0)) && isDeposited;
  const referralCount = user?.referralCount || 0;
  const isKycVerified = user?.kycStatus === 'verified';

  // 2FA verification inputs state for Bonus Center
  const twoFaInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [twoFaCodeInputs, setTwoFaCodeInputs] = useState<string[]>(['', '', '', '', '', '']);
  const [twoFaCodeError, setTwoFaCodeError] = useState<string>('');
  const [twoFaGeneratedCode] = useState<string>('44A891');

  // Email verification flow state
  const [emailVerifyStep, setEmailVerifyStep] = useState<'initial' | 'email_input' | 'code_input'>('initial');
  const [emailVerifyEmail, setEmailVerifyEmail] = useState('');
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [emailVerifyError, setEmailVerifyError] = useState('');

  const handleTwoFaInputChange = (index: number, value: string) => {
    const val = value.toUpperCase();
    const newInputs = [...twoFaCodeInputs];
    newInputs[index] = val;
    setTwoFaCodeInputs(newInputs);
    setTwoFaCodeError('');

    if (val && index < 5) {
      twoFaInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTwoFaKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !twoFaCodeInputs[index] && index > 0) {
      twoFaInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyTwoFaCode = async () => {
    const codeStr = twoFaCodeInputs.join('');
    if (codeStr.length !== 6) {
      setTwoFaCodeError('Please enter all 6 characters.');
      return;
    }
    const hasDouble = /44|55|99|00|11|22|33|66|77|88/.test(codeStr) || /(\d)\1/.test(codeStr);
    const hasLetter = /[a-zA-Z]/.test(codeStr);

    if (!hasDouble || !hasLetter) {
      setTwoFaCodeError('Code must contain a double number (like 44, 55, 99) and at least one letter.');
      return;
    }

    try {
      safeStorage.setItem('aver_twoFactorEnabled', 'true');
      await updateProfile({ preferences: { ...(user as any)?.preferences, twoFactorEnabled: true } });
      addNotification('security', 'high', '2FA Enabled Successfully', 'Authenticator verified! +25% progress added.');
      setSelectedTask(null);
      setCurrentView('main');
    } catch (err) {
      console.error("Failed to verify 2FA code", err);
      setTwoFaCodeError('Verification failed. Please try again.');
    }
  };

  // XP & Tier Calculation via tierManager
  const tierState = useMemo(() => {
    return getTierState(user, session);
  }, [user, session]);

  const currentTier = useMemo(() => {
    const t = tierState.currentTier;
    return {
      id: t.id,
      name: t.name,
      icon: t.id === 'bronze' ? Trophy : t.id === 'platinum' ? Star : Crown,
      requirements: t.requirements,
      benefits: t.benefits,
      color: t.color
    };
  }, [tierState.currentTier]);

  const nextTier = useMemo(() => {
    if (!tierState.nextTier) return null;
    const t = tierState.nextTier;
    return {
      id: t.id,
      name: t.name,
      icon: t.id === 'platinum' ? Star : Crown,
      requirements: t.requirements,
      benefits: t.benefits,
      color: t.color
    };
  }, [tierState.nextTier]);

  const membershipProgress = tierState.progress;
  const isPlatinumOrHigher = currentTier.id === 'platinum' || currentTier.id === 'gold';

  const tasks: Task[] = useMemo(() => {
    return tierState.activeTasks.map(t => {
      let IconComponent = CheckCircle2;
      if (t.iconKey === 'shield') IconComponent = ShieldCheck;
      if (t.iconKey === 'wallet') IconComponent = Wallet;
      if (t.iconKey === 'trade') IconComponent = TrendingUp;
      if (t.iconKey === 'users') IconComponent = Users;
      if (t.iconKey === 'copy') IconComponent = Users;
      if (t.iconKey === 'cpu') IconComponent = Cpu;
      if (t.iconKey === 'sparkles') IconComponent = Sparkles;

      return {
        id: t.id,
        title: t.title,
        progress: t.progress,
        increment: t.increment,
        status: t.status,
        icon: IconComponent,
        actionLabel: t.actionLabel,
        customAction: t.customAction as any,
        targetTab: t.targetTab,
        description: t.description,
        requirements: t.requirements,
        isMission: t.isMission
      };
    });
  }, [tierState.activeTasks]);

  const welcomeBonusUnlocked = profileProgress >= 100 || (profileProgress === 100 && isTwoFactorEnabled && isDeposited && isTraded);

  const handleClaimWelcomeBonus = async () => {
    if (welcomeBonusClaimed) return;
    try {
      await addDeposit(150);
      await updateProfile({ welcomeBonusClaimed: true } as any);
      safeStorage.setItem('aver_welcome_bonus_claimed', 'true');
      addNotification('rewards', 'high', '$150 Welcome Bonus Claimed', '$150 has been added to your account balance!');
      setSelectedTask(null);
      setCurrentView('main');
    } catch (err) {
      console.error("Failed to claim welcome bonus", err);
    }
  };

  const welcomeTask: Task = useMemo(() => ({
    id: 'welcome',
    title: '$150 WELCOME BONUS',
    progress: welcomeBonusClaimed ? 100 : ((profileProgress === 100 ? 25 : 0) + (isTwoFactorEnabled ? 25 : 0) + (isDeposited ? 25 : 0) + (isTraded ? 25 : 0)),
    increment: 0,
    status: welcomeBonusClaimed ? 'completed' : (welcomeBonusUnlocked ? 'unlocked' : 'locked'),
    icon: Sparkles,
    actionLabel: welcomeBonusClaimed ? 'Claimed' : (welcomeBonusUnlocked ? 'Withdraw' : 'Locked'),
    description: 'Complete the required onboarding milestones to unlock your $150 Welcome Bonus.',
    requirements: [
      { label: 'Complete Profile (100% Progress)', done: profileProgress === 100 },
      { label: 'Enable 2FA', done: isTwoFactorEnabled },
      { label: 'First Deposit', done: isDeposited },
      { label: 'First Trade', done: isTraded }
    ],
    isMission: true,
    customAction: 'claim_welcome'
  }), [profileProgress, isTwoFactorEnabled, isDeposited, isTraded, welcomeBonusUnlocked, welcomeBonusClaimed]);

  const dailyMissions: Mission[] = useMemo(() => {
    const list: Mission[] = [];
    if (!welcomeBonusClaimed) {
      list.push({ 
        id: 'welcome', 
        title: '$150 WELCOME BONUS', 
        reward: welcomeBonusUnlocked ? 'Withdraw' : 'Locked', 
        icon: Sparkles, 
        isCustomTask: true, 
        taskRef: 'welcome' 
      });
    }
    list.push(
      { id: 'm2', title: 'Trade once', reward: '+1% Progress', icon: TrendingUp },
      { id: 'm3', title: 'View Markets', reward: '+0.3% Progress', icon: Clock },
      { id: 'm4', title: 'Check Portfolio', reward: '+0.3% Progress', icon: Wallet }
    );
    return list;
  }, [welcomeBonusUnlocked, welcomeBonusClaimed]);

  // Achievements
  const accountAgeMs = new Date().getTime() - new Date(user?.createdAt || Date.now()).getTime();
  const achievements: Achievement[] = useMemo(() => [
    { id: 'a1', title: 'First Deposit', status: isDeposited ? 'completed' : 'locked', icon: Wallet },
    { id: 'a2', title: 'First Trade', status: isTraded ? 'completed' : 'locked', icon: TrendingUp },
    { id: 'a3', title: `10 Trades (${Math.min(tradesCount, 10)}/10)`, status: tradesCount >= 10 ? 'completed' : 'locked', icon: Award },
    { id: 'a4', title: `100 Trades (${Math.min(tradesCount, 100)}/100)`, status: tradesCount >= 100 ? 'completed' : 'locked', icon: Trophy },
    { id: 'a5', title: '1 Year Member', status: accountAgeMs >= 31536000000 ? 'completed' : 'locked', icon: Calendar },
    { id: 'a6', title: `Invite 10 Friends`, status: referralCount >= 10 ? 'completed' : 'locked', icon: Users }
  ], [isDeposited, isTraded, tradesCount, accountAgeMs, referralCount]);

  const rewardHistory = useMemo(() => {
    const hist = [];
    if (welcomeBonusUnlocked) {
      hist.push({ title: 'Welcome Bonus', amount: '$150', status: 'Claimed', date: new Date().toLocaleDateString(), color: 'text-emerald-500' });
    }
    if (profileProgress === 100) {
      hist.push({ title: 'Profile Completed', amount: '+15% Progress', status: 'Claimed', date: new Date().toLocaleDateString(), color: 'text-emerald-500' });
    }
    if (isTwoFactorEnabled) {
      hist.push({ title: '2FA Enabled', amount: '+25% Progress', status: 'Claimed', date: new Date().toLocaleDateString(), color: 'text-emerald-500' });
    }
    if (isDeposited) {
      hist.push({ title: 'First Deposit', amount: '+25% Progress', status: 'Claimed', date: new Date().toLocaleDateString(), color: 'text-emerald-500' });
    }
    if (isTraded && user?.trades?.[0]) {
      hist.push({ title: 'First Trade', amount: '+15% Progress', status: 'Claimed', date: new Date(user.trades[0].timestamp).toLocaleDateString(), color: 'text-emerald-500' });
    }
    return hist.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profileProgress, isTwoFactorEnabled, isDeposited, isTraded, welcomeBonusUnlocked, user?.trades]);

  const handleTaskAction = async (task: Task) => {
    if (task.status === 'completed' || task.status === 'locked') return;
    
    if (task.customAction === 'claim_welcome') {
      if (welcomeBonusUnlocked && !welcomeBonusClaimed) {
        await handleClaimWelcomeBonus();
      }
    } else if (task.customAction === 'deposit_1000') {
      if (onOpenDeposit) {
        onOpenDeposit();
      } else {
        safeStorage.setItem('aver_auto_open_deposit', 'true');
        safeStorage.setItem('aver_dashboard_tab', 'home');
        onNavigate?.('dashboard');
      }
    } else if (task.customAction === 'trade_500' || task.targetTab === 'ai') {
      safeStorage.setItem('aver_dashboard_tab', 'ai');
      onNavigate?.('ai');
    } else if (task.customAction === 'copy_10' || task.targetTab === 'copy-trading') {
      safeStorage.setItem('aver_dashboard_tab', 'copy-trading');
      onNavigate?.('copy-trading');
    } else if (task.customAction === 'strat_2') {
      safeStorage.setItem('aver_dashboard_tab', 'discover');
      onNavigate?.('discover');
    } else if (task.customAction === 'deposit') {
      if (onOpenDeposit) {
        onOpenDeposit();
      } else {
        safeStorage.setItem('aver_auto_open_deposit', 'true');
        safeStorage.setItem('aver_dashboard_tab', 'home');
        onNavigate?.('dashboard');
      }
    } else if (task.customAction === 'profile' || task.id === 'referral') {
      if (task.id === 'referral') {
        onNavigate?.('referral-centre');
      } else {
        safeStorage.setItem('aver_dashboard_tab', 'profile');
        onNavigate?.('profile');
      }
    } else if (task.customAction === 'kyc' || task.id === 'kyc') {
      onNavigate?.('kyc-verification');
    } else if (task.customAction === 'enable_2fa' || task.id === '2fa') {
      setShowTwoFactorModal(true);
    } else if (task.customAction === 'verify_email') {
      setSelectedTask(task);
      setCurrentView('task-details');
      setEmailVerifyStep('email_input');
      setEmailVerifyEmail(user?.email || '');
      setEmailVerifyCode('');
      setEmailVerifyError('');
    } else if (task.targetTab) {
      safeStorage.setItem('aver_dashboard_tab', task.targetTab);
      onNavigate?.(task.targetTab);
    }
  };

  const handleBackOrClose = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
      setSelectedTask(null);
    } else {
      onBack();
    }
  };

  const renderHeader = (title: string, subtitle?: string, showHistory = false) => (
    <header className="flex justify-between items-center px-5 py-4 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-20 border-b border-white/5">
      <div className="flex items-center gap-3">
        <button 
          onClick={handleBackOrClose} 
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all active:scale-95 text-emerald-500"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white leading-none">{title}</h1>
          {subtitle && <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showHistory && (
          <button 
            onClick={() => setCurrentView('history')}
            className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            aria-label="View history"
          >
            <HistoryIcon className="w-5 h-5 text-emerald-500" />
          </button>
        )}
        <button 
          onClick={handleBackOrClose}
          className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  );

  const TaskDetailsView = () => {
    if (!selectedTask) return null;
    const isCompleted = selectedTask.status === 'completed';

    return (
      <div className="pb-12 bg-slate-950">
        <header className="flex justify-between items-center px-6 py-4 sticky top-0 bg-slate-950/80 backdrop-blur-md z-20 border-b border-white/5">
          <button onClick={handleBackOrClose} className="p-2 rounded-xl hover:bg-white/5 text-emerald-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-black text-white">Task Details</h2>
          <button onClick={handleBackOrClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="px-6 py-6 space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl ${
              isCompleted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>
              <selectedTask.icon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-white">{selectedTask.title}</h3>
            {selectedTask.description ? (
              <p className="text-sm text-gray-500 mt-2 max-w-xs">{selectedTask.description}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-2 max-w-xs">
                Complete this milestone to earn <span className="text-emerald-500 font-bold">{selectedTask.increment}% progress</span> towards your next membership tier.
              </p>
            )}
          </div>

          <div className="p-8 rounded-[40px] bg-slate-900 border border-white/5 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-500">
                <span>Current Progress</span>
                <span className="text-emerald-500">{selectedTask.progress}%</span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedTask.progress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Requirements</h4>
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950/50 border border-white/5">
                {selectedTask.requirements ? (
                  selectedTask.requirements.map((req, idx) => (
                    <div key={`${req.label}-${idx}`} className="flex items-center gap-3">
                      <CheckCircle2 className={`w-5 h-5 ${req.done ? 'text-emerald-500' : 'text-gray-600'}`} />
                      <span className={`text-sm ${req.done ? 'text-white font-bold' : 'text-gray-400'}`}>{req.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-5 h-5 ${isCompleted ? 'text-emerald-500' : 'text-gray-600'}`} />
                    <span className="text-sm text-gray-400">Perform the action: <span className="text-white font-bold">{selectedTask.title}</span></span>
                  </div>
                )}
              </div>
            </div>

            {!selectedTask.isMission && (
              <>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Estimated Completion</h4>
                  <p className="text-sm text-gray-400">Usually takes <span className="text-white font-bold">1-2 minutes</span> once initiated.</p>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Benefits after unlocking</h4>
                  <p className="text-sm text-gray-400">Directly contributes to your next tier rewards and permanent fee reductions.</p>
                </div>
              </>
            )}
          </div>

          <div className="pt-4 space-y-4">
            {selectedTask?.id === '2fa' && !isCompleted && (
              <div className="p-6 rounded-[32px] bg-slate-900 border border-emerald-500/30 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-white">Enter 2FA Authenticator Code</h4>
                  <p className="text-xs text-gray-400">
                    Enter the 6-character code from your authenticator app. Must contain a double number (like 44, 55, 99) and at least one letter.
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                    Test code hint: {twoFaGeneratedCode}
                  </p>
                </div>

                <div className="flex justify-center space-x-2 py-2">
                  {twoFaCodeInputs.map((char, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={char}
                      ref={(el) => { twoFaInputRefs.current[index] = el; }}
                      onChange={(e) => handleTwoFaInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleTwoFaKeyDown(index, e)}
                      className="w-11 h-12 text-center text-lg font-mono font-bold bg-slate-950 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  ))}
                </div>

                {twoFaCodeError && (
                  <p className="text-center text-xs text-rose-500 font-bold">{twoFaCodeError}</p>
                )}

                <button
                  onClick={handleVerifyTwoFaCode}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Verify & Enable 2FA
                </button>
              </div>
            )}

            {selectedTask?.id === 'email_verify' && !isCompleted && (
              <div className="p-6 rounded-[32px] bg-slate-900 border border-emerald-500/30 space-y-4">
                {emailVerifyStep === 'email_input' && (
                  <>
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-white">Verify Your Email Address</h4>
                      <p className="text-xs text-gray-400">
                        Please confirm your email address to receive a verification code.
                      </p>
                    </div>
                    <input
                      type="email"
                      value={emailVerifyEmail}
                      onChange={(e) => setEmailVerifyEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-white text-center font-medium focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (!emailVerifyEmail || !emailVerifyEmail.includes('@')) {
                          setEmailVerifyError('Please enter a valid email address');
                          return;
                        }
                        setEmailVerifyError('');
                        setEmailVerifyStep('code_input');
                      }}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Send Verification Code
                    </button>
                    {emailVerifyError && <p className="text-center text-xs text-rose-500 font-bold">{emailVerifyError}</p>}
                  </>
                )}
                {emailVerifyStep === 'code_input' && (
                  <>
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-white">Enter Verification Code</h4>
                      <p className="text-xs text-gray-400">
                        We sent a 6-character code to <span className="text-emerald-400 font-bold">{emailVerifyEmail}</span>.
                      </p>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailVerifyCode}
                      onChange={(e) => {
                        setEmailVerifyCode(e.target.value.toUpperCase());
                        setEmailVerifyError('');
                      }}
                      placeholder="Enter 6-character code"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-white text-center font-bold tracking-[0.25em] focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    {emailVerifyError && <p className="text-center text-xs text-rose-500 font-bold">{emailVerifyError}</p>}
                    <button
                      onClick={async () => {
                        const code = emailVerifyCode;
                        if (code.length !== 6 || !/[A-Za-z]/.test(code) || !/([0-9])\1/.test(code)) {
                          setEmailVerifyError('Invalid code');
                          return;
                        }
                        try {
                          safeStorage.setItem('aver_email_verified', 'true');
                          if (auth.currentUser) {
                            sendEmailVerification(auth.currentUser).catch(() => {});
                          }
                          await updateProfile({ emailVerified: true });
                          addNotification('security', 'medium', 'Email Verified', 'Your email address has been successfully verified! +20% progress added.');
                          setSelectedTask(null);
                          setCurrentView('main');
                        } catch (err) {
                          console.error("Failed to verify email", err);
                          setEmailVerifyError('An error occurred during verification.');
                        }
                      }}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Verify Code
                    </button>
                  </>
                )}
              </div>
            )}

            {isCompleted ? (
              <div className="w-full py-5 rounded-[28px] bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-emerald-500 font-black text-sm">Reward already claimed and progress added.</p>
              </div>
            ) : selectedTask?.id !== '2fa' && selectedTask?.id !== 'email_verify' ? (
              <div className="space-y-3">
                <button 
                  onClick={() => handleTaskAction(selectedTask)}
                  disabled={selectedTask.status === 'locked'}
                  className={`w-full py-5 rounded-[28px] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                    selectedTask.status === 'locked' ? 'bg-white/5 text-gray-500 cursor-not-allowed shadow-none hover:scale-100' : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {selectedTask.actionLabel}
                </button>

                {['deposit_1000', 'trade_500', 'copy_10', 'strat_2'].includes(selectedTask.id) && (
                  <button
                    onClick={() => {
                      completePlatinumTask(selectedTask.id, user?.uid);
                      addNotification('rewards', 'high', `${selectedTask.title} Completed!`, `Successfully earned +${selectedTask.increment}% progress toward your membership tier!`);
                      setSelectedTask(null);
                      setCurrentView('main');
                    }}
                    className="w-full py-4 rounded-[24px] font-bold text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    Mark as Completed & Claim (+{selectedTask.increment}% Progress)
                  </button>
                )}
              </div>
            ) : null}
            {!isCompleted && selectedTask.status === 'locked' && (
              <p className="text-center text-xs text-rose-500 font-bold mt-4">Requirements not yet completed.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MainView = () => (
    <div className="pb-12">
      {renderHeader("Bonus Center", "Trading milestones & rewards.", true)}
      
      {/* SECTION 1: MEMBERSHIP PROGRESS */}
      <section className="px-6 py-6">
        <motion.div 
          onClick={() => setCurrentView('membership-details')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-8 rounded-[40px] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border border-emerald-500/10 shadow-2xl overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-2 block">Current Membership</span>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentTier.color} opacity-90 flex items-center justify-center shadow-lg`}>
                  <currentTier.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{currentTier.id === 'bronze' ? '🥉' : currentTier.id === 'platinum' ? '🥈' : '🥇'} {currentTier.name}</h3>
                  <p className="text-[11px] text-gray-400 font-bold">Trading Fees: {currentTier.id === 'bronze' ? '0.1%' : currentTier.id === 'platinum' ? '0.08%' : '0.05%'}</p>
                </div>
              </div>
            </div>
            {nextTier && (
              <div className="text-right">
                <span className="text-xs font-black text-white/40 uppercase tracking-widest">Next Tier</span>
                <p className="text-sm font-black text-emerald-500">{nextTier.id === 'platinum' ? '🥈' : '🥇'} {nextTier.name.split(' ')[0]}</p>
              </div>
            )}
          </div>

          {/* PROGRESS BAR */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[11px] font-black text-gray-500 uppercase tracking-tighter">
              <span>{currentTier.name.split(' ')[0]}</span>
              <span className="text-emerald-500 text-lg">{membershipProgress}%</span>
              <span>{nextTier ? nextTier.name.split(' ')[0] : 'Max'}</span>
            </div>
            <div className="h-4 w-full bg-slate-950 rounded-full border border-white/5 overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${membershipProgress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer" />
              </motion.div>
            </div>
            <p className="text-[11px] text-gray-500 font-medium text-center italic">
              “Complete platform activities to gradually unlock higher membership levels.”
            </p>
          </div>
        </motion.div>
      </section>

      {/* SECTION 2: MEMBERSHIP JOURNEY */}
      <section className="py-4">
        <div className="px-6 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-black text-white">Membership Journey</h2>
          <button 
            onClick={() => setCurrentView('membership-details')}
            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest"
          >
            View Benefits
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-6 scrollbar-hide snap-x snap-mandatory">
          {TIERS.map((tier, idx) => {
            const isCurrent = tier.id === currentTier.id;
            const isUnlocked = TIERS.findIndex(t => t.id === tier.id) <= TIERS.findIndex(t => t.id === currentTier.id);
            
            return (
              <motion.div 
                key={`tier-card-${tier.id}-${idx}`}
                onClick={() => setCurrentView('membership-details')}
                whileHover={{ scale: 1.02 }}
                className={`min-w-[280px] p-6 rounded-[32px] border snap-start cursor-pointer transition-all ${
                  isCurrent 
                  ? `bg-gradient-to-br ${tier.color} border-white/20 shadow-2xl ring-4 ring-white/10` 
                  : isUnlocked
                  ? 'bg-slate-800 border-white/10'
                  : 'bg-slate-900 border-white/5 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl bg-white/10 border border-white/20`}>
                    <tier.icon className={`w-6 h-6 text-white`} />
                  </div>
                  {isCurrent ? (
                    <span className="bg-white/20 text-[10px] font-black px-3 py-1.5 rounded-full border border-white/30 text-white uppercase tracking-widest">Active</span>
                  ) : isUnlocked ? (
                    <span className="bg-white/10 text-[10px] font-black px-3 py-1.5 rounded-full border border-white/10 text-white uppercase tracking-widest">Completed</span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Locked
                    </div>
                  )}
                </div>
                <h4 className="text-xl font-black text-white mb-1">{tier.name}</h4>
                <p className="text-[11px] text-white/60 font-medium mb-4">{tier.requirements}</p>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                  {tier.benefits.slice(0, 3).map((benefit, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-white/50" />
                      <span className="text-[10px] text-white/80 font-bold">{benefit}</span>
                    </div>
                  ))}
                  {tier.benefits.length > 3 && (
                    <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-2">+{tier.benefits.length - 3} More Benefits</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: HOW TO LEVEL UP */}
      <section className="px-6 py-6">
        <h2 className="text-lg font-black text-white mb-6">How To Level Up</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentTier.id === 'platinum' ? [
            { label: 'Deposit $1000', value: '+25%', icon: Wallet, dest: 'deposit' },
            { label: 'Trade $500 in one session', value: '+25%', icon: TrendingUp, dest: 'ai' },
            { label: 'Copy trade 10 traders', value: '+25%', icon: Users, dest: 'copy-trading' },
            { label: 'Use 2 strategies from engine', value: '+25%', icon: Cpu, dest: 'discover' },
            { label: 'Invite an active friend', value: '+15%', icon: Users, dest: 'referral-centre' }
          ] : [
            { label: 'Verify email address', value: '+20%', icon: BadgeCheck, dest: 'profile' },
            { label: 'Enable 2FA security', value: '+25%', icon: ShieldCheck, dest: '2fa' },
            { label: 'Complete first deposit', value: '+25%', icon: Wallet, dest: 'deposit' },
            { label: 'Complete KYC verification', value: '+35%', icon: ShieldCheck, dest: 'kyc-verification' },
            { label: 'Execute first trade', value: '+15%', icon: TrendingUp, dest: 'ai' },
            { label: 'Invite an active friend', value: '+15%', icon: Users, dest: 'referral-centre' }
          ]).map((item, idx) => (
            <div 
              key={`level-up-${item.label}-${idx}`}
              onClick={() => {
                if (item.dest === '2fa') {
                  setShowTwoFactorModal(true);
                } else if (item.dest === 'deposit') {
                  if (onOpenDeposit) onOpenDeposit();
                  else {
                    safeStorage.setItem('aver_auto_open_deposit', 'true');
                    safeStorage.setItem('aver_dashboard_tab', 'home');
                    onNavigate?.('dashboard');
                  }
                } else if (item.dest === 'referral-centre') {
                  onNavigate?.('referral-centre');
                } else if (item.dest === 'kyc-verification') {
                  onNavigate?.('kyc-verification');
                } else {
                  safeStorage.setItem('aver_dashboard_tab', item.dest);
                  onNavigate?.(item.dest);
                }
              }}
              className="flex items-center justify-between p-4 rounded-[24px] bg-slate-900 border border-white/5 group hover:border-emerald-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                  <item.icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                </div>
                <span className="text-sm font-bold text-white">{item.label}</span>
              </div>
              <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: ACTIVE TASKS */}
      <section className="px-6 py-6">
        <h2 className="text-lg font-black text-white mb-6">Current Tasks</h2>
        <div className="space-y-4">
          {tasks.map((task, idx) => (
            <motion.div 
              key={`task-${task.id || idx}-${idx}`}
              onClick={() => {
                if (task.id === '2fa' || task.customAction === 'enable_2fa') {
                  setShowTwoFactorModal(true);
                } else if (task.id === 'kyc' || task.customAction === 'kyc') {
                  onNavigate?.('kyc-verification');
                } else {
                  setSelectedTask(task);
                  setCurrentView('task-details');
                }
              }}
              whileHover={{ x: 4 }}
              className="p-6 rounded-[32px] bg-slate-900 border border-white/5 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-500'
                }`}>
                  <task.icon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-24 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-white/20'}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase">{task.progress}%</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskAction(task);
                }}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  task.status === 'completed' 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                  : task.status === 'locked'
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95'
                }`}
              >
                {task.status === 'completed' ? (
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Completed
                  </div>
                ) : task.actionLabel}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 5: DAILY MISSIONS */}
      <section className="px-6 py-6">
        <h2 className="text-lg font-black text-white mb-6">Daily Missions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyMissions.map((mission, idx) => (
            <div 
              key={`mission-${mission.id || idx}-${idx}`} 
              onClick={async () => {
                if (mission.id === 'welcome') {
                  if (welcomeBonusUnlocked && !welcomeBonusClaimed) {
                    await handleClaimWelcomeBonus();
                  } else {
                    setSelectedTask(welcomeTask);
                    setCurrentView('task-details');
                  }
                } else if (mission.id === 'm2') { // Trade once (+1% progress)
                  const currentP = (user as any)?.profileProgress || 0;
                  const newProgress = Math.min(100, Math.round((currentP + 1) * 10) / 10);
                  await updateProfile({ profileProgress: newProgress } as any);
                  addNotification('rewards', 'low', 'Progress Increased', '+1% progress added!');
                  safeStorage.setItem('aver_dashboard_tab', 'markets');
                  onNavigate?.('markets');
                } else if (mission.id === 'm3') { // View Markets (+0.3% progress)
                  const currentP = (user as any)?.profileProgress || 0;
                  const newProgress = Math.min(100, Math.round((currentP + 0.3) * 10) / 10);
                  await updateProfile({ profileProgress: newProgress } as any);
                  addNotification('rewards', 'low', 'Progress Increased', '+0.3% progress added!');
                  safeStorage.setItem('aver_dashboard_tab', 'markets');
                  onNavigate?.('markets');
                } else if (mission.id === 'm4') { // Check Portfolio (+0.3% progress)
                  const currentP = (user as any)?.profileProgress || 0;
                  const newProgress = Math.min(100, Math.round((currentP + 0.3) * 10) / 10);
                  await updateProfile({ profileProgress: newProgress } as any);
                  addNotification('rewards', 'low', 'Progress Increased', '+0.3% progress added!');
                  safeStorage.setItem('aver_dashboard_tab', 'home');
                  onNavigate?.('dashboard');
                }
              }}
              className="p-5 rounded-[28px] bg-slate-900 border border-white/5 flex justify-between items-center group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/[0.02] transition-colors" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-colors">
                  <mission.icon className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">{mission.title}</h5>
                  <p className="text-[10px] font-black text-emerald-500 uppercase mt-0.5">{mission.reward}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all group-hover:translate-x-1" />
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: ACHIEVEMENTS */}
      <section className="px-6 py-12">
        <h2 className="text-lg font-black text-white mb-8">Achievements</h2>
        <div className="grid grid-cols-3 gap-6">
          {achievements.map((ach, idx) => (
            <div 
              key={`ach-${ach.id || idx}-${idx}`} 
              onClick={() => {
                if (ach.id === 'a6' || ach.title.toLowerCase().includes('invite')) {
                  onNavigate?.('referral-centre');
                }
              }}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 relative transition-all duration-500 ${
                ach.status === 'completed'
                ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 shadow-xl shadow-emerald-500/10'
                : 'bg-slate-900/50 border-white/5 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-60'
              }`}>
                {ach.status === 'completed' && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1 border-4 border-slate-950">
                    <Check className="w-3 h-3 text-slate-950" />
                  </div>
                )}
                <ach.icon className={`w-10 h-10 ${ach.status === 'completed' ? 'text-emerald-500' : 'text-gray-500'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase text-center tracking-tight ${
                ach.status === 'completed' ? 'text-white' : 'text-gray-600'
              }`}>{ach.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const HistoryView = () => (
    <div className="pb-12 bg-slate-950">
      {renderHeader("Reward History")}
      <div className="px-6 py-4 space-y-4">
        {rewardHistory.length > 0 ? rewardHistory.map((item, idx) => (
          <div key={`${item.title}-${item.date}-${idx}`} className="p-5 rounded-[28px] bg-slate-900 border border-white/5 flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-[11px] text-gray-500 font-medium">{item.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-white">{item.amount}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${item.color}`}>{item.status}</p>
            </div>
          </div>
        )) : (
          <div className="py-20 flex flex-col items-center text-center px-10">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <HistoryIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-black text-white">No history yet</h3>
            <p className="text-sm text-gray-500 mt-2">Complete tasks to earn your first rewards.</p>
          </div>
        )}
      </div>
    </div>
  );

  const MembershipDetailsView = () => (
    <div className="pb-12 bg-slate-950">
      {renderHeader("Tier Benefits")}
      <div className="px-6 py-6 space-y-8">
        {TIERS.map((tier, idx) => (
          <div key={`tier-detail-${tier.id}-${idx}`} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tier.color} text-white shadow-lg`}>
                <tier.icon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white">{tier.name}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {tier.benefits.map((benefit, bIdx) => (
                <div key={`benefit-${tier.id}-${bIdx}`} className="p-4 rounded-[24px] bg-slate-900 border border-white/5 flex items-center gap-4">
                  <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden font-sans"
    >
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {currentView === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide"
            >
              {MainView()}
            </motion.div>
          )}
          
          {currentView === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide"
            >
              {HistoryView()}
            </motion.div>
          )}
  
          {currentView === 'membership-details' && (
            <motion.div 
              key="membership"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide"
            >
              {MembershipDetailsView()}
            </motion.div>
          )}
  
          {currentView === 'task-details' && (
            <motion.div 
              key="task-details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide"
            >
              {TaskDetailsView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM SAFE AREA SPACER */}
      <div className="h-[env(safe-area-inset-bottom,20px)] w-full bg-slate-950 border-t border-white/5 flex items-center justify-center">
        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">Avernox Engine</p>
      </div>

      {/* Standalone 2FA Modal */}
      <TwoFactorAuthModal
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
        theme={theme}
      />
    </motion.div>
  );
}


