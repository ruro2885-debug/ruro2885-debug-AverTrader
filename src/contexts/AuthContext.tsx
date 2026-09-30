import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch,
  increment,
  arrayUnion
} from "firebase/firestore";
import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { getDocs } from "firebase/firestore";
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { safeStorage } from '../utils/storage';
import { NotificationItem, NotificationCategory, NotificationPriority } from '../types/notifications';
import { UserProfile, Theme, Language, Holding, TradeHistoryItem, PortfolioSnapshot } from '../types';
import { NotificationManager } from '../services/NotificationManager';
import { getAvatarDataUrl } from '../utils/avatarGenerator';
import { TradingEngineConfig } from '../types/trading';
import { portfolioPersistenceService } from '../services/portfolioPersistenceService';
import { walletService } from '../services/walletService';
import { progressionService } from '../services/progressionService';
import { transactionService } from '../services/transactionService';
import { sanitizeAndResetUserData } from '../services/dataSanitizer';
import { saveLocalWithdrawal } from '../lib/withdrawalStore';

export interface UserPreferences {
  language: string;
  theme: string;
  currency: string;
  notifications: {
    marketing?: boolean;
    security?: boolean;
    signals?: boolean;
    master?: boolean;
    profile?: boolean;
    deposits?: boolean;
    withdrawals?: boolean;
    trading?: boolean;
    system?: boolean;
    referrals?: boolean;
    rewards?: boolean;
    criticalAlertsSound?: boolean;
  };
  dashboardPreferences: {
    showSignals: boolean;
    showWatchlist: boolean;
    showNews: boolean;
  };
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorEnabledAt?: string;
  twoFactorBackupCodes?: string[];
  biometricsEnabled?: boolean;
  rememberMeEnabled?: boolean;
  watchlist: string[];
}

export interface PortfolioData {
  totalValue: number;
  todayPnL: number;
  todayPnLPercent: number;
  overallReturn: number;
  realizedPnL: number;
  unrealizedPnL: number;
  healthScore: number;
  diversificationScore: number;
  volatility: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  recoveryFactor: number;
  riskAdjustedReturn: number;
}

export interface DepositItem {
  id: string;
  amount: number;
  txHash: string;
  status: string;
  date: string;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  txHash: string;
  status: string;
  date: string;
}



export interface HistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade';
  asset?: string;
  amount: number;
  valueUsd: number;
  date: string;
  status: string;
}

export interface User extends UserProfile {
  notificationsList: NotificationItem[];
  history: HistoryItem[]; // Kept for legacy if needed, but we'll use trades subcollection
  deposits: DepositItem[];
  withdrawals: WithdrawalItem[];
  portfolio: PortfolioData;
  holdings: Holding[];
  trades: TradeHistoryItem[];
  snapshots: PortfolioSnapshot[];
  tradingConfig?: TradingEngineConfig;
  watchlist: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateOnboarding: (completed: boolean) => Promise<void>;
  updateProfilePhoto: (file: File | string | null) => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  updateTradingConfig: (config: Partial<TradingEngineConfig>) => Promise<void>;
  toggleWatchlist: (symbol: string) => Promise<void>;
  addDeposit: (amount: number) => Promise<void>;
  addWithdrawal: (amount: number) => Promise<void>;
  
  addNotification: (category: NotificationCategory, priority: NotificationPriority, title: string, body: string, actionUrl?: string, action?: string, metadata?: Record<string, any>, userId?: string) => Promise<void>;
  markNotificationRead: (id: string, readState?: boolean) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  pinNotification: (id: string) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;

  notifications: NotificationItem[];
  updateProfile: (dataOrDisplayName: Partial<User> | string, username?: string, email?: string, silent?: boolean) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  resetAllFinancialData: () => Promise<void>;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  country: string;
  phoneNumber?: string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signOutUser: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  forgotPassword: async () => {},
  updateOnboarding: async () => {},
  updateProfilePhoto: async () => {},
  updateUserPreferences: async () => {},
  updateTradingConfig: async () => {},
  toggleWatchlist: async () => {},
  addDeposit: async () => {},
  addWithdrawal: async () => {},
  
  addNotification: async () => {},
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
  deleteNotification: async () => {},
  clearNotifications: async () => {},
  pinNotification: async () => {},
  archiveNotification: async () => {},

  notifications: [],
  updateProfile: async () => {},
  changePassword: async () => {},
  verifyCurrentPassword: async () => false,
  resetAllFinancialData: async () => {},
});

// Helper for local database simulation
const getLocalDB = (): any[] => {
  const dbStr = safeStorage.getItem('aver_local_db');
  return dbStr ? JSON.parse(dbStr) : [];
};

const saveLocalDB = (dbList: any[]) => {
  safeStorage.setItem('aver_local_db', JSON.stringify(dbList));
};

const getFirebaseErrorCode = (error: any): string => {
  if (!error) return '';
  if (typeof error.code === 'string') return error.code;
  if (error.customData && typeof error.customData.code === 'string') return error.customData.code;
  const msg = error.message || '';
  if (msg.includes('admin-restricted-operation')) return 'auth/admin-restricted-operation';
  if (msg.includes('operation-not-allowed')) return 'auth/operation-not-allowed';
  const match = /auth\/[a-zA-Z0-9-]+/.exec(msg);
  if (match) return match[0];
  return '';
};

const isRestrictedAuthError = (error: any): boolean => {
  const code = getFirebaseErrorCode(error);
  const msg = (error?.message || '').toLowerCase();
  return (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/admin-restricted-operation' ||
    code === 'auth/network-request-failed' ||
    code === 'auth/internal-error' ||
    msg.includes('admin-restricted-operation') ||
    msg.includes('operation-not-allowed') ||
    msg.includes('restricted-operation')
  );
};

const isPermissionError = (error: any): boolean => {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'permission-denied' ||
    code === 'auth/unauthorized' ||
    code === 'resource-exhausted' ||
    msg.includes('permission') ||
    msg.includes('insufficient') ||
    msg.includes('unauthorized') ||
    msg.includes('quota') ||
    msg.includes('exhausted')
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (safeStorage.getItem('aver_logged_out') === 'true') {
        return null;
      }
      const cached = safeStorage.getItem('aver_active_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.uid) {
          // Restore saved profile photo if available in dedicated local storage
          const cachedPhoto = safeStorage.getItem(`aver_custom_photo_${parsed.uid}`) || safeStorage.getItem('aver_last_custom_photo');
          if (cachedPhoto && (!parsed.profilePhotoURL || parsed.profilePhotoURL.startsWith('data:image/svg+xml'))) {
            parsed.profilePhotoURL = cachedPhoto;
            parsed.avatarUrl = cachedPhoto;
            parsed.hasCustomPhoto = true;
          }
          // Ensure non-zero balance consistency
          if (parsed.availableBalance > 0 && (!parsed.tokenBalance || parsed.tokenBalance === 0)) {
            parsed.tokenBalance = parsed.availableBalance;
          } else if (parsed.tokenBalance > 0 && (!parsed.availableBalance || parsed.availableBalance === 0)) {
            parsed.availableBalance = parsed.tokenBalance;
          }
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [previewPhotoURL, setPreviewPhotoURL] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const notificationManagerRef = useRef<NotificationManager | null>(null);
  const avatarSetupRef = useRef<boolean>(false);
  const recentNotificationTrackerRef = useRef<Map<string, number>>(new Map());

  // Unified subscription tracker accessible across all auth methods & logout
  const subscriptionsRef = useRef<{
    unsubUserDoc: (() => void) | null;
    unsubNotifications: (() => void) | null;
    unsubHoldings: (() => void) | null;
    unsubTrades: (() => void) | null;
    unsubSnapshots: (() => void) | null;
    unsubTradingConfig: (() => void) | null;
    unsubPortfolioCurrent: (() => void) | null;
    unsubWallet: (() => void) | null;
    visibilityHandler: (() => void) | null;
  }>({
    unsubUserDoc: null,
    unsubNotifications: null,
    unsubHoldings: null,
    unsubTrades: null,
    unsubSnapshots: null,
    unsubTradingConfig: null,
    unsubPortfolioCurrent: null,
    unsubWallet: null,
    visibilityHandler: null,
  });

  const clearAllSubscriptions = useCallback(() => {
    const s = subscriptionsRef.current;
    if (s.unsubUserDoc) { try { s.unsubUserDoc(); } catch (e) {} s.unsubUserDoc = null; }
    if (s.unsubNotifications) { try { s.unsubNotifications(); } catch (e) {} s.unsubNotifications = null; }
    if (s.unsubHoldings) { try { s.unsubHoldings(); } catch (e) {} s.unsubHoldings = null; }
    if (s.unsubTrades) { try { s.unsubTrades(); } catch (e) {} s.unsubTrades = null; }
    if (s.unsubSnapshots) { try { s.unsubSnapshots(); } catch (e) {} s.unsubSnapshots = null; }
    if (s.unsubTradingConfig) { try { s.unsubTradingConfig(); } catch (e) {} s.unsubTradingConfig = null; }
    if (s.unsubPortfolioCurrent) { try { s.unsubPortfolioCurrent(); } catch (e) {} s.unsubPortfolioCurrent = null; }
    if (s.unsubWallet) { try { s.unsubWallet(); } catch (e) {} s.unsubWallet = null; }
    if (s.visibilityHandler) {
      try { document.removeEventListener('visibilitychange', s.visibilityHandler); } catch (e) {}
      s.visibilityHandler = null;
    }
    if (notificationManagerRef.current) {
      try { notificationManagerRef.current.unsubscribeAll(); } catch (e) {}
      notificationManagerRef.current = null;
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const userWithPreview = useMemo(() => {
    if (!user) return null;
    
    // Determine the effective avatar: preview (if set) -> user.avatarUrl -> user.profilePhotoURL -> cached custom photo
    let effectiveAvatar = user.avatarUrl || user.profilePhotoURL || "";
    let hasCustomPhoto = !!user.hasCustomPhoto;
    
    if (user.uid) {
      try {
        const cachedCustom = safeStorage.getItem(`aver_custom_photo_${user.uid}`) || safeStorage.getItem('aver_last_custom_photo');
        if (cachedCustom && (!effectiveAvatar || effectiveAvatar.startsWith('data:image/svg+xml'))) {
          effectiveAvatar = cachedCustom;
          hasCustomPhoto = true;
        }
      } catch (e) {}
    }

    if (effectiveAvatar && !effectiveAvatar.startsWith('data:image/svg+xml')) {
      hasCustomPhoto = true;
    }
    
    if (previewPhotoURL) {
      effectiveAvatar = previewPhotoURL;
      hasCustomPhoto = true;
    }
    
    return {
      ...user,
      profilePhotoURL: effectiveAvatar,
      avatarUrl: effectiveAvatar,
      hasCustomPhoto
    };
  }, [user, previewPhotoURL]);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(async () => {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch (e) {}
    });

    const setupSubscriptions = (uid: string, email: string | null) => {
      if (safeStorage.getItem('aver_logged_out') === 'true') return;

      progressionService.updateProgress(uid, 'login').catch(() => {});
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && safeStorage.getItem('aver_logged_out') !== 'true') {
          progressionService.updateProgress(uid, 'login').catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      subscriptionsRef.current.visibilityHandler = handleVisibilityChange;

      notificationManagerRef.current = new NotificationManager(uid);
      notificationManagerRef.current.subscribe((notifs) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        setNotifications(notifs);
      });

      // Wallet subscription
      subscriptionsRef.current.unsubWallet = walletService.subscribeWallet(uid, (wData) => {
        if (!wData || safeStorage.getItem('aver_logged_out') === 'true') return;
        setUser(prev => {
          if (!prev || safeStorage.getItem('aver_logged_out') === 'true') return null;
          const portVal = wData.portfolioValue || wData.portfolioBalance || prev.portfolio?.totalValue || 0;
          
          // Never overwrite a valid balance with 0 due to temporary subscription state
          const safePortBal = (typeof wData.portfolioBalance === 'number' && wData.portfolioBalance > 0)
            ? wData.portfolioBalance
            : (prev.portfolioBalance || 0);
          const safeAvailBal = (typeof wData.availableBalance === 'number' && wData.availableBalance > 0)
            ? wData.availableBalance
            : (prev.availableBalance || safePortBal);
          const safeTokenBal = (typeof wData.tokenBalance === 'number' && wData.tokenBalance > 0)
            ? wData.tokenBalance
            : (prev.tokenBalance || safeAvailBal);

          const updated: User = {
            ...prev,
            portfolioBalance: safePortBal,
            availableBalance: safeAvailBal,
            vaultBalance: typeof wData.vaultBalance === 'number' ? wData.vaultBalance : (prev.vaultBalance ?? 0),
            totalDeposits: (typeof wData.totalDeposits === 'number' && wData.totalDeposits > 0) ? wData.totalDeposits : prev.totalDeposits,
            totalWithdrawals: wData.totalWithdrawals ?? prev.totalWithdrawals,
            tokenBalance: safeTokenBal,
            aiTradingCapital: typeof wData.aiTradingCapital === 'number' ? wData.aiTradingCapital : prev.aiTradingCapital,
            cashBalance: safeTokenBal,
            portfolio: {
              ...prev.portfolio,
              totalValue: portVal > 0 ? portVal : (prev.portfolio?.totalValue || safePortBal)
            }
          };
          return updated;
        });
      });

      // Portfolio current subscription
      subscriptionsRef.current.unsubPortfolioCurrent = portfolioPersistenceService.subscribePortfolioCurrent(uid, (pState) => {
        if (!pState || safeStorage.getItem('aver_logged_out') === 'true') return;
        setUser(prev => {
          if (!prev || safeStorage.getItem('aver_logged_out') === 'true') return null;
          
          // Only update wallet balances from pState if they are valid positive values
          const pPortBal = (typeof pState.walletState?.portfolioBalance === 'number' && pState.walletState.portfolioBalance > 0)
            ? pState.walletState.portfolioBalance
            : prev.portfolioBalance;
          const pAvailBal = (typeof pState.walletState?.availableBalance === 'number' && pState.walletState.availableBalance > 0)
            ? pState.walletState.availableBalance
            : prev.availableBalance;
          const pTokenBal = (typeof pState.walletState?.tokenBalance === 'number' && pState.walletState.tokenBalance > 0)
            ? pState.walletState.tokenBalance
            : prev.tokenBalance;

          const cooldownUntil = parseInt(safeStorage.getItem(`aver_session_end_cooldown_${uid}`) || '0', 10);
          const isInCooldown = Date.now() < cooldownUntil;

          const pTodayPnL = pState.portfolioMetrics?.todayPnL;
          const prevTodayPnL = prev.portfolio?.todayPnL;
          let resolvedTodayPnL = pTodayPnL;
          if (isInCooldown) {
            resolvedTodayPnL = (typeof prevTodayPnL === 'number' && prevTodayPnL !== 0) ? prevTodayPnL : pTodayPnL;
          } else if ((pTodayPnL === 0 || pTodayPnL === undefined) && typeof prevTodayPnL === 'number' && prevTodayPnL !== 0) {
            resolvedTodayPnL = prevTodayPnL;
          }

          const pOverall = pState.portfolioMetrics?.overallReturn;
          const prevOverall = prev.portfolio?.overallReturn;
          let resolvedOverall = pOverall;
          if (isInCooldown) {
            resolvedOverall = (typeof prevOverall === 'number' && prevOverall !== 0) ? prevOverall : pOverall;
          } else if ((pOverall === 0 || pOverall === undefined) && typeof prevOverall === 'number' && prevOverall !== 0) {
            resolvedOverall = prevOverall;
          }

          const pProfit = pState.walletState?.totalProfit;
          const prevProfit = prev.totalProfit;
          const resolvedProfit = (typeof pProfit === 'number' && pProfit > 0)
            ? pProfit
            : (typeof prevProfit === 'number' && prevProfit > 0 ? prevProfit : (pProfit ?? 0));

          const pLoss = pState.walletState?.totalLoss;
          const prevLoss = prev.totalLoss;
          const resolvedLoss = (typeof pLoss === 'number' && pLoss > 0)
            ? pLoss
            : (typeof prevLoss === 'number' && prevLoss > 0 ? prevLoss : (pLoss ?? 0));

          const updated: User = {
            ...prev,
            portfolioBalance: pPortBal,
            availableBalance: pAvailBal,
            vaultBalance: typeof pState.walletState?.vaultBalance === 'number' ? pState.walletState.vaultBalance : (prev.vaultBalance ?? 0),
            totalDeposits: (typeof pState.walletState?.totalDeposits === 'number' && pState.walletState.totalDeposits > 0)
              ? pState.walletState.totalDeposits
              : prev.totalDeposits,
            totalWithdrawals: pState.walletState?.totalWithdrawals ?? prev.totalWithdrawals,
            totalProfit: resolvedProfit,
            totalLoss: resolvedLoss,
            tokenBalance: pTokenBal,
            portfolio: {
              ...prev.portfolio,
              ...(pState.portfolioMetrics || {}),
              ...(resolvedTodayPnL !== undefined ? { todayPnL: resolvedTodayPnL } : {}),
              ...(resolvedOverall !== undefined ? { overallReturn: resolvedOverall } : {})
            },
            aiSettings: {
              ...prev.aiSettings,
              ...(pState.commandCenter?.aiSettings || {})
            }
          };
          return updated;
        });
      });

      // User profile subscription
      if (uid.startsWith('local-')) {
        return;
      }

      const userDocRef = doc(db, 'users', uid);
      subscriptionsRef.current.unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          
          setUser(prev => {
            if (safeStorage.getItem('aver_logged_out') === 'true') return null;
            
            // Retain valid positive balance; never overwrite with 0 on temporary listener updates
            const pBal = (typeof userData.portfolioBalance === 'number' && userData.portfolioBalance > 0)
              ? userData.portfolioBalance
              : (typeof prev?.portfolioBalance === 'number' && prev.portfolioBalance > 0 ? prev.portfolioBalance : (userData.portfolioBalance ?? 0));
            const aBal = (typeof userData.availableBalance === 'number' && userData.availableBalance > 0)
              ? userData.availableBalance
              : (typeof prev?.availableBalance === 'number' && prev.availableBalance > 0 ? prev.availableBalance : (userData.availableBalance ?? pBal));
            const tBal = (typeof userData.tokenBalance === 'number' && userData.tokenBalance > 0)
              ? userData.tokenBalance
              : (typeof prev?.tokenBalance === 'number' && prev.tokenBalance > 0 ? prev.tokenBalance : aBal);
            
            // Retain saved custom profile photo
            const cachedCustomPhoto = safeStorage.getItem(`aver_custom_photo_${uid}`) || safeStorage.getItem('aver_last_custom_photo');
            const resolvedPhoto = userData.profilePhotoURL || userData.avatarUrl || prev?.profilePhotoURL || prev?.avatarUrl || cachedCustomPhoto || undefined;
            const hasCustomPhoto = (userData.hasCustomPhoto !== undefined ? userData.hasCustomPhoto : (prev?.hasCustomPhoto !== undefined ? prev.hasCustomPhoto : !!cachedCustomPhoto)) || (resolvedPhoto && !resolvedPhoto.startsWith('data:image/svg+xml'));

            const cooldownUntil = parseInt(safeStorage.getItem(`aver_session_end_cooldown_${uid}`) || '0', 10);
            const isInCooldown = Date.now() < cooldownUntil;

            const uTodayPnL = userData.portfolio?.todayPnL;
            const prevTodayPnL = prev?.portfolio?.todayPnL;
            let resolvedTodayPnL = uTodayPnL;
            if (isInCooldown) {
              resolvedTodayPnL = (typeof prevTodayPnL === 'number' && prevTodayPnL !== 0) ? prevTodayPnL : uTodayPnL;
            } else if ((uTodayPnL === 0 || uTodayPnL === undefined) && typeof prevTodayPnL === 'number' && prevTodayPnL !== 0) {
              resolvedTodayPnL = prevTodayPnL;
            }

            const uOverall = userData.portfolio?.overallReturn;
            const prevOverall = prev?.portfolio?.overallReturn;
            let resolvedOverall = uOverall;
            if (isInCooldown) {
              resolvedOverall = (typeof prevOverall === 'number' && prevOverall !== 0) ? prevOverall : uOverall;
            } else if ((uOverall === 0 || uOverall === undefined) && typeof prevOverall === 'number' && prevOverall !== 0) {
              resolvedOverall = prevOverall;
            }

            const uProfit = userData.totalProfit;
            const prevProfit = prev?.totalProfit;
            const resolvedProfit = (typeof uProfit === 'number' && uProfit > 0)
              ? uProfit
              : (typeof prevProfit === 'number' && prevProfit > 0 ? prevProfit : (uProfit ?? 0));

            const uLoss = userData.totalLoss;
            const prevLoss = prev?.totalLoss;
            const resolvedLoss = (typeof uLoss === 'number' && uLoss > 0)
              ? uLoss
              : (typeof prevLoss === 'number' && prevLoss > 0 ? prevLoss : (uLoss ?? 0));

            const updatedUser = {
              ...(prev || {}),
              ...userData,
              profilePhotoURL: resolvedPhoto,
              avatarUrl: resolvedPhoto,
              hasCustomPhoto,
              portfolioBalance: pBal,
              availableBalance: aBal,
              vaultBalance: typeof userData.vaultBalance === 'number' ? userData.vaultBalance : (prev?.vaultBalance ?? 0),
              tokenBalance: tBal,
              aiTradingCapital: typeof userData.aiTradingCapital === 'number' ? userData.aiTradingCapital : (prev?.aiTradingCapital ?? 0),
              cashBalance: typeof userData.cashBalance === 'number' ? userData.cashBalance : tBal,
              holdings: userData.holdings || prev?.holdings || [],
              trades: userData.trades || prev?.trades || [],
              snapshots: userData.snapshots || prev?.snapshots || [],
              totalProfit: resolvedProfit,
              totalLoss: resolvedLoss,
              portfolio: {
                ...(prev?.portfolio || {}),
                ...(userData.portfolio || {}),
                ...(resolvedTodayPnL !== undefined ? { todayPnL: resolvedTodayPnL } : {}),
                ...(resolvedOverall !== undefined ? { overallReturn: resolvedOverall } : {})
              }
            } as User;
            
            // Only cache essential profile info if still active and not logged out
            if (safeStorage.getItem('aver_logged_out') !== 'true') {
              const profileToCache = { ...updatedUser };
              delete (profileToCache as any).trades;
              delete (profileToCache as any).holdings;
              delete (profileToCache as any).snapshots;
              delete (profileToCache as any).history;
              delete (profileToCache as any).notificationsList;
              safeStorage.setItem(`user_profile_${uid}`, JSON.stringify(profileToCache));
              safeStorage.setItem('aver_active_user', JSON.stringify(profileToCache));
            }
            
            return updatedUser;
          });
        } else if (email) {
          // Auto-initialize profile if it doesn't exist
          const seed = email.toLowerCase();
          const dataUrl = getAvatarDataUrl(seed);

          const cachedStr = safeStorage.getItem(`user_profile_${uid}`) || safeStorage.getItem('aver_active_user');
          let existingProfile: any = null;
          if (cachedStr) {
            try { existingProfile = JSON.parse(cachedStr); } catch (e) {}
          }
          const cachedPhoto = safeStorage.getItem(`aver_custom_photo_${uid}`) || safeStorage.getItem('aver_last_custom_photo');
          const finalPhoto = existingProfile?.profilePhotoURL || existingProfile?.avatarUrl || cachedPhoto || dataUrl;
          const finalHasCustom = (finalPhoto && !finalPhoto.startsWith('data:image/svg+xml')) || !!existingProfile?.hasCustomPhoto;

          const defaultProfile = {
            uid,
            email,
            username: existingProfile?.username || email.split('@')[0],
            role: existingProfile?.role || 'user',
            profilePhotoURL: finalPhoto,
            avatarUrl: finalPhoto,
            avatarSeed: existingProfile?.avatarSeed || seed,
            hasCustomPhoto: finalHasCustom,
            accountType: existingProfile?.accountType || 'Standard',
            accountStatus: existingProfile?.accountStatus || 'Active',
            portfolioBalance: existingProfile?.portfolioBalance ?? 0,
            availableBalance: existingProfile?.availableBalance ?? (existingProfile?.portfolioBalance ?? 0),
            vaultBalance: existingProfile?.vaultBalance ?? 0,
            tokenBalance: existingProfile?.tokenBalance ?? existingProfile?.availableBalance ?? (existingProfile?.portfolioBalance ?? 0),
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            onboardingCompleted: true,
            notificationsList: [],
            portfolio: {
              totalValue: existingProfile?.portfolioBalance ?? 0,
              todayPnL: 0,
              todayPnLPercent: 0,
              overallReturn: 0,
              realizedPnL: 0,
              unrealizedPnL: 0,
              healthScore: 100,
              diversificationScore: 100,
              volatility: 0,
              sharpeRatio: 0,
              winRate: 0,
              maxDrawdown: 0,
              recoveryFactor: 0,
              riskAdjustedReturn: 0
            }
          };
          setDoc(userDocRef, defaultProfile, { merge: true });
        }
      }, (err) => {
        console.error("[AuthContext] unsubUserDoc error:", err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      });

      // Holdings, Trades, Snapshots subscriptions
      const holdingsRef = collection(db, 'users', uid, 'holdings');
      subscriptionsRef.current.unsubHoldings = onSnapshot(holdingsRef, (snap) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        const holdings = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Holding[];
        setUser(prev => (prev && safeStorage.getItem('aver_logged_out') !== 'true') ? { ...prev, holdings } : null);
      }, (err) => {
        console.error("[AuthContext] unsubHoldings error:", err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}/holdings`);
      });

      const tradesRef = collection(db, 'users', uid, 'trades');
      subscriptionsRef.current.unsubTrades = onSnapshot(query(tradesRef, orderBy('timestamp', 'desc')), (snap) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        const trades = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TradeHistoryItem[];
        setUser(prev => (prev && safeStorage.getItem('aver_logged_out') !== 'true') ? { ...prev, trades } : null);
      }, (err) => {
        console.error("[AuthContext] unsubTrades error:", err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}/trades`);
      });

      const snapshotsRef = collection(db, 'users', uid, 'snapshots');
      subscriptionsRef.current.unsubSnapshots = onSnapshot(query(snapshotsRef, orderBy('timestamp', 'desc')), (snap) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        const snapshots = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PortfolioSnapshot[];
        setUser(prev => (prev && safeStorage.getItem('aver_logged_out') !== 'true') ? { ...prev, snapshots } : null);
      }, (err) => {
        console.error("[AuthContext] unsubSnapshots error:", err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}/snapshots`);
      });

      const configRef = doc(db, 'users', uid, 'tradingConfig', 'default');
      subscriptionsRef.current.unsubTradingConfig = onSnapshot(configRef, (docSnap) => {
        if (safeStorage.getItem('aver_logged_out') === 'true') return;
        if (docSnap.exists()) {
          const config = docSnap.data() as TradingEngineConfig;
          setUser(prev => (prev && safeStorage.getItem('aver_logged_out') !== 'true') ? { ...prev, tradingConfig: config } : null);
        }
      }, (err) => {
        console.error("[AuthContext] unsubTradingConfig error:", err);
        handleFirestoreError(err, OperationType.GET, `users/${uid}/tradingConfig/default`);
      });
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthContext] Auth state changed, user:", firebaseUser ? firebaseUser.uid : "null");

      // Check if user has explicitly logged out
      const isLoggedOut = safeStorage.getItem('aver_logged_out') === 'true';

      if (isLoggedOut) {
        clearAllSubscriptions();
        setUser(null);
        setNotifications([]);
        setPreviewPhotoURL(null);
        setLoading(false);
        if (firebaseUser) {
          signOut(auth).catch(() => {});
        }
        return;
      }
      
      // Cleanup existing listeners before attaching new ones
      clearAllSubscriptions();

      if (firebaseUser) {
        setupSubscriptions(firebaseUser.uid, firebaseUser.email);
        setLoading(false);
      } else {
        // User is signed out from Firebase
        const activeLocalUserStr = safeStorage.getItem('aver_active_user');
        if (activeLocalUserStr && safeStorage.getItem('aver_logged_out') !== 'true') {
          try {
            const activeLocalUser = JSON.parse(activeLocalUserStr) as User;
            // Clear invalid profiles without uid so user lands on Login/Register
            if (!activeLocalUser?.uid || activeLocalUser.uid === 'guest_user') {
              safeStorage.removeItem('aver_active_user');
              setUser(null);
            } else {
              // Valid signed-in user (persisted local, demo, or fallback)
              setUser(activeLocalUser);
              if (activeLocalUser.uid) {
                setupSubscriptions(activeLocalUser.uid, activeLocalUser.email);
              }
            }
          } catch (e) {
            safeStorage.removeItem('aver_active_user');
            setUser(null);
          }
        } else {
          setUser(null);
          setNotifications([]);
          setPreviewPhotoURL(null);
        }
        setLoading(false);
      }
    });

    const handleLocalUserUpdate = () => {
      if (safeStorage.getItem('aver_logged_out') === 'true') {
        if (userRef.current !== null) {
          setUser(null);
        }
        return;
      }

      if (!auth.currentUser) {
        const activeLocalUserStr = safeStorage.getItem('aver_active_user');
        if (activeLocalUserStr) {
          try {
            const activeLocalUser = JSON.parse(activeLocalUserStr) as User;
            if (activeLocalUser && activeLocalUser.uid && activeLocalUser.uid !== 'guest_user') {
              setUser(activeLocalUser);
              setNotifications(activeLocalUser.notificationsList || []);
            }
          } catch (e) {
            console.warn("Error loading active local user on update event:", e);
          }
        } else {
          setUser(null);
        }
      } else {
        const uid = auth.currentUser.uid;
        const profileStr = safeStorage.getItem(`user_profile_${uid}`) || safeStorage.getItem('aver_active_user');
        if (profileStr) {
          try {
            const pData = JSON.parse(profileStr);
            if (pData) {
              setUser(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  streak: pData.streak !== undefined ? pData.streak : (pData.loginStreak !== undefined ? pData.loginStreak : prev.streak),
                  loginStreak: pData.loginStreak !== undefined ? pData.loginStreak : (pData.streak !== undefined ? pData.streak : prev.loginStreak),
                  lastActivityAt: pData.lastActivityAt || pData.lastLoginDate || prev.lastActivityAt,
                  lastLoginDate: pData.lastLoginDate || pData.lastActivityAt || prev.lastLoginDate,
                  xp: pData.xp !== undefined ? pData.xp : prev.xp,
                  level: pData.level !== undefined ? pData.level : prev.level,
                  insignias: pData.insignias || prev.insignias,
                  winRun: pData.winRun !== undefined ? pData.winRun : prev.winRun,
                  aiTradesCount: pData.aiTradesCount !== undefined ? pData.aiTradesCount : prev.aiTradesCount,
                  kycStatus: pData.kycStatus !== undefined ? pData.kycStatus : prev.kycStatus,
                  kycData: pData.kycData !== undefined ? pData.kycData : prev.kycData,
                  kycHistory: pData.kycHistory !== undefined ? pData.kycHistory : prev.kycHistory,
                  kycRewardUnlocked: pData.kycRewardUnlocked !== undefined ? pData.kycRewardUnlocked : prev.kycRewardUnlocked,
                  kycApprovedAt: pData.kycApprovedAt !== undefined ? pData.kycApprovedAt : prev.kycApprovedAt,
                  kycRejectionReason: pData.kycRejectionReason !== undefined ? pData.kycRejectionReason : prev.kycRejectionReason,
                  kycResubmissionReason: pData.kycResubmissionReason !== undefined ? pData.kycResubmissionReason : prev.kycResubmissionReason
                };
              });
            }
          } catch (e) {}
        }
      }
    };

    const handleKycStatusChanged = (e: any) => {
      if (e?.detail) {
        const { userId, email, status, reason } = e.detail;
        setUser(prev => {
          if (!prev) return prev;
          const matches = (userId && prev.uid === userId) || (email && prev.email?.toLowerCase() === email.toLowerCase()) || !auth.currentUser;
          if (matches) {
            return {
              ...prev,
              kycStatus: status,
              kycRejectionReason: reason || null,
              kycRewardUnlocked: status === 'verified' ? true : prev.kycRewardUnlocked,
              kycApprovedAt: status === 'verified' ? new Date().toISOString() : prev.kycApprovedAt,
              kycData: prev.kycData ? { ...prev.kycData, status, rejectionReason: reason || null } : prev.kycData
            };
          }
          return prev;
        });
      }
    };

    window.addEventListener('aver_user_updated', handleLocalUserUpdate);
    window.addEventListener('storage', handleLocalUserUpdate);
    window.addEventListener('aver_kyc_status_changed', handleKycStatusChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('aver_user_updated', handleLocalUserUpdate);
      window.removeEventListener('storage', handleLocalUserUpdate);
      window.removeEventListener('aver_kyc_status_changed', handleKycStatusChanged);
      clearAllSubscriptions();
    };
  }, [clearAllSubscriptions]);

  const signUp = useCallback(async (data: SignUpData) => {
    try {
      safeStorage.removeItem('aver_logged_out');
      // 1. Try to create Firebase Auth account
      let userCredential;
      let isFirebaseRestricted = false;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      } catch (innerError: any) {
        if (isRestrictedAuthError(innerError)) {
          console.warn("Firebase Auth disabled or restricted in console, falling back to local database");
          isFirebaseRestricted = true;
        } else {
          throw innerError;
        }
      }

      // Check if user already exists in Firestore by email to prevent duplication
      let existingFirestoreUser: any = null;
      let existingFirestoreUserUid: string | null = null;
      try {
        const q = query(collection(db, 'users'), where('email', '==', data.email.toLowerCase().trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Sort to find the best candidate (prefer real UIDs over local ones if multiple exist)
          const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
          docs.sort((a, b) => {
            const aIsLocal = a.id.startsWith('local-');
            const bIsLocal = b.id.startsWith('local-');
            if (aIsLocal && !bIsLocal) return 1;
            if (!aIsLocal && bIsLocal) return -1;
            return 0;
          });
          existingFirestoreUser = docs[0].data;
          existingFirestoreUserUid = docs[0].id;
          console.log("[AuthContext] Found existing user in Firestore by email:", existingFirestoreUserUid);
        }
      } catch (err) {
        console.warn("Failed to check for existing user in Firestore:", err);
      }

      if (existingFirestoreUserUid && !userCredential && !isFirebaseRestricted) {
        throw new Error("An account with this email already exists. Please sign in.");
      }

      const targetUid = userCredential?.user.uid || existingFirestoreUserUid || `local-${Math.random().toString(36).substring(2, 11)}`;
      const avatarSeed = data.email.toLowerCase();
      const dataUrl = getAvatarDataUrl(avatarSeed);
      const username = data.username || data.email.split('@')[0];

      // Prepare newUser object
      const newUser: User = existingFirestoreUser ? {
        ...existingFirestoreUser,
        uid: targetUid,
        email: data.email.toLowerCase().trim(),
        lastLogin: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      } : {
        uid: targetUid,
        username: username,
        email: data.email,
        avatarSeed,
        avatarUrl: dataUrl,
        profilePhotoURL: dataUrl,
        hasCustomPhoto: true,
        role: 'user',
        country: data.country,
        phoneNumber: data.phoneNumber || '',
        accountType: 'Standard',
        accountStatus: 'Active',
        portfolioBalance: 0,
        availableBalance: 0,
        vaultBalance: 0,
        activeOffset: 0,
        totalProfit: 0,
        totalLoss: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        referredBy: data.referralCode || null,
        referralCode: `AVR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        referralCount: 0,
        preferredLanguage: 'EN',
        theme: 'dark',
        notificationSettings: {
          marketing: true,
          security: true,
          signals: true,
          master: true
        },
        biometricEnabled: false,
        aiTradingEnabled: false,
        aiSettings: {
          copilotMode: 'copilot',
          maxActiveTrades: 3,
          riskProfile: 'Balanced',
          drawdownStopLimit: 2.5,
          maxCapitalExposure: 40,
          consecutiveLosses: 0
        },
        riskPreference: 'Moderate',
        level: 1,
        xp: 0,
        streak: 1,
        loginStreak: 1,
        lastActivityAt: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        winRun: 0,
        aiTradesCount: 0,
        insignias: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        onboardingCompleted: false,
        notificationsList: [],
        history: [],
        deposits: [],
        withdrawals: [],
        portfolio: {
          totalValue: 0,
          todayPnL: 0,
          todayPnLPercent: 0,
          overallReturn: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          healthScore: 0,
          diversificationScore: 0,
          volatility: 0,
          sharpeRatio: 0,
          winRate: 0,
          maxDrawdown: 0,
          recoveryFactor: 0,
          riskAdjustedReturn: 0
        },
        holdings: [],
        trades: [],
        snapshots: [],
        watchlist: []
      };

      // Always sanitize and clear any legacy local/guest state for the new user ID
      await sanitizeAndResetUserData(targetUid, 0);
      safeStorage.removeItem(`aver_session_${targetUid}`);
      safeStorage.removeItem(`aver_trades_${targetUid}`);
      safeStorage.removeItem(`aver_positions_${targetUid}`);
      safeStorage.removeItem(`aver_activity_${targetUid}`);
      safeStorage.removeItem('aver_session_guest_user');
      safeStorage.removeItem('aver_trades_guest_user');
      safeStorage.removeItem('aver_positions_guest_user');
      safeStorage.removeItem('aver_activity_guest_user');

      if (userCredential && !isFirebaseRestricted) {
        // Firebase Auth account successfully created, write to Firestore
        const firebaseUser = userCredential.user;
        const firestoreUser = {
          ...newUser,
          createdAt: existingFirestoreUser?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), firestoreUser, { merge: true });

        // If we migrated from a local doc, delete it
        if (existingFirestoreUserUid && existingFirestoreUserUid !== firebaseUser.uid) {
          try {
            await deleteDoc(doc(db, 'users', existingFirestoreUserUid));
            console.log(`[AuthContext] Deleted migrated local user doc: ${existingFirestoreUserUid}`);
          } catch (delErr) {
            console.warn("Failed to delete migrated user doc:", delErr);
          }
        }
      } else {
        // Fallback local registration
        const dbList = getLocalDB();
        const existing = dbList.find(u => u.email.toLowerCase() === data.email.toLowerCase());
        if (existing) {
          throw new Error("An account with this email already exists.");
        }
        dbList.push({
          email: data.email.toLowerCase(),
          password: data.password,
          profile: newUser
        });
        saveLocalDB(dbList);

        // Synchronize fallback local user to Firestore 'users' collection
        const firestoreUser = {
          ...newUser,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };
        await setDoc(doc(db, 'users', targetUid), firestoreUser, { merge: true }).catch(err => {
          console.warn("Failed writing fallback local user to Firestore:", err);
        });

        // Log the user in locally immediately
        safeStorage.setItem('aver_active_user', JSON.stringify(newUser));
        setUser(newUser);
        setNotifications([]);
        setLoading(false);
      }

      // Process Referral Linkage to credit referrer
      if (data.referralCode && data.referralCode.trim()) {
        const refCodeClean = data.referralCode.trim();
        try {
          const refQuery = query(collection(db, 'users'), where('referralCode', '==', refCodeClean));
          let refSnap = await getDocs(refQuery);
          if (refSnap.empty && refCodeClean.toUpperCase() !== refCodeClean) {
            const refQueryUpper = query(collection(db, 'users'), where('referralCode', '==', refCodeClean.toUpperCase()));
            refSnap = await getDocs(refQueryUpper);
          }
          
          if (!refSnap.empty) {
            const referrerDoc = refSnap.docs[0];
            const referrerUid = referrerDoc.id;
            const referrerData = referrerDoc.data();
            
            const newRefUser = {
              uid: targetUid,
              name: username,
              displayName: username,
              email: data.email.toLowerCase().trim(),
              joinedAt: new Date().toISOString()
            };

            const existingList = Array.isArray(referrerData.referredUsers) ? referrerData.referredUsers : [];
            const updatedList = [...existingList, newRefUser];
            const updatedCount = (referrerData.referralCount || referrerData.totalReferrals || 0) + 1;

            await updateDoc(doc(db, 'users', referrerUid), {
              referralCount: updatedCount,
              totalReferrals: updatedCount,
              referredUsers: updatedList,
              lastUpdated: serverTimestamp()
            }).catch(e => console.warn("Failed updating referrer doc:", e));
          }
        } catch (refErr) {
          console.warn("Failed processing referral linkage:", refErr);
        }
      }
    } catch (error: any) {
      console.warn("signUp note:", error?.message || error);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      safeStorage.removeItem('aver_logged_out');
      const cleanEmail = (email || '').toLowerCase().trim();

      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      } catch (pError) {
        try {
          await setPersistence(auth, inMemoryPersistence);
        } catch (e) {}
        console.warn("Failed to set auth persistence (possibly blocked in iframe):", pError);
      }

      let firebaseError: any = null;
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (innerError: any) {
        firebaseError = innerError;
      }

      if (!firebaseError && auth.currentUser) {
        const uid = auth.currentUser.uid;
        safeStorage.removeItem('aver_logged_out');
        
        try {
          const userDocRef = doc(db, 'users', uid);
          const docSnap = await getDoc(userDocRef);
          let loadedUser: User;
          if (docSnap.exists()) {
            const data = docSnap.data();
            loadedUser = {
              uid,
              email: cleanEmail,
              displayName: data.displayName || data.fullName || cleanEmail.split('@')[0],
              ...data
            } as User;
          } else {
            const dbList = getLocalDB();
            const localRecord = dbList.find(u => u.email?.toLowerCase() === cleanEmail);
            if (localRecord?.profile) {
              loadedUser = localRecord.profile;
            } else {
              loadedUser = {
                uid,
                email: cleanEmail,
                displayName: auth.currentUser.displayName || cleanEmail.split('@')[0],
                portfolioBalance: 0,
                availableBalance: 0,
                tokenBalance: 0,
                vaultBalance: 0,
                aiTradingCapital: 0,
                portfolio: { totalValue: 0 }
              } as User;
            }
          }
          userRef.current = loadedUser;
          setUser(loadedUser);
          safeStorage.setItem(`user_profile_${uid}`, JSON.stringify(loadedUser));
          safeStorage.setItem('aver_active_user', JSON.stringify(loadedUser));
        } catch (e) {
          console.warn("[AuthContext] Fast-path profile load fallback:", e);
        }
        setLoading(false);
        return;
      }

      if (firebaseError) {
        // 1. Check local user record in aver_local_db
        const dbList = getLocalDB();
        const localRecord = dbList.find(u => u.email?.toLowerCase() === cleanEmail);
        
        if (localRecord) {
          if (localRecord.password && localRecord.password !== password) {
            throw new Error("Incorrect password for this account. Please try again.");
          }

          let updatedProfile = { ...localRecord.profile };
          const cachedCustom = safeStorage.getItem(`aver_custom_photo_${updatedProfile.uid}`) || safeStorage.getItem('aver_last_custom_photo');
          if (cachedCustom && (!updatedProfile.profilePhotoURL || updatedProfile.profilePhotoURL.startsWith('data:image/svg+xml'))) {
            updatedProfile.profilePhotoURL = cachedCustom;
            updatedProfile.avatarUrl = cachedCustom;
            updatedProfile.hasCustomPhoto = true;
          } else if (!updatedProfile.avatarSeed || !updatedProfile.avatarUrl) {
            updatedProfile.avatarSeed = updatedProfile.avatarSeed || updatedProfile.uid;
            const dataUrl = getAvatarDataUrl(updatedProfile.avatarSeed);
            updatedProfile.avatarUrl = updatedProfile.avatarUrl || dataUrl;
            if (!updatedProfile.profilePhotoURL) {
              updatedProfile.profilePhotoURL = dataUrl;
            }
          }

          const userProfile = {
            ...updatedProfile,
            lastLogin: new Date().toISOString()
          } as User;

          localRecord.profile = userProfile;
          saveLocalDB(dbList);

          setDoc(doc(db, 'users', userProfile.uid), {
            ...userProfile,
            lastLogin: serverTimestamp(),
            lastUpdated: serverTimestamp()
          }, { merge: true }).catch(err => {
            console.warn("Failed sync userProfile to Firestore:", err);
          });

          safeStorage.setItem('aver_active_user', JSON.stringify(userProfile));
          setUser(userProfile);
          setNotifications(userProfile.notificationsList || []);
          setLoading(false);
          return;
        }

        // Map Firebase error codes to clean, actionable user messages
        const errCode = getFirebaseErrorCode(firebaseError);
        if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential' || errCode === 'auth/user-not-found') {
          throw new Error("Incorrect email or password. Please check your credentials or create an account.");
        }
        if (errCode === 'auth/user-disabled') {
          throw new Error("This account has been disabled. Please contact support.");
        }
        if (errCode === 'auth/too-many-requests') {
          throw new Error("Too many failed login attempts. Please try again later.");
        }
        if (errCode === 'auth/network-request-failed') {
          throw new Error("Network connection error. Please verify your connection and try again.");
        }

        throw new Error(firebaseError?.message || "Incorrect email or password. Please try again.");
      }
    } catch (error: any) {
      console.warn("Auth signIn note:", error?.message || error);
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      // 1. Set explicit logout flag to block any race condition / background sync / auto-relogin
      safeStorage.setItem('aver_logged_out', 'true');

      // 2. Tear down all Firestore & notification listeners
      clearAllSubscriptions();

      // 3. Clear all user session, cache, and profile keys
      const currentUid = userRef.current?.uid;
      if (currentUid) {
        safeStorage.removeItem(`user_profile_${currentUid}`);
        safeStorage.removeItem(`aver_session_${currentUid}`);
        safeStorage.removeItem(`aver_positions_${currentUid}`);
        safeStorage.removeItem(`aver_trades_${currentUid}`);
        safeStorage.removeItem(`aver_activity_${currentUid}`);
        safeStorage.removeItem(`aver_recommendations_${currentUid}`);
        safeStorage.removeItem(`aver_session_control_${currentUid}`);
        safeStorage.removeItem(`aver_wallet_${currentUid}`);
        safeStorage.removeItem(`aver_portfolio_current_${currentUid}`);
      }

      safeStorage.removeItem('aver_active_user');
      safeStorage.removeItem('aver_dashboard_tab');
      safeStorage.removeItem('portfolio_vault_balance');
      safeStorage.removeItem('portfolio_active_offset');
      safeStorage.removeItem('aver_connected_wallet');
      safeStorage.removeItem('aver_trading_config');
      safeStorage.removeItem('aver_real_nav_stack_v2');
      safeStorage.setItem('aver_real_nav_stack_v2', JSON.stringify([{ id: 'root-home', view: 'home', tab: 'home', aiView: 'HOME', modal: null }]));
      safeStorage.removeItem('aver_redirect_after_login');
      safeStorage.removeItem('aver_session_initialized');

      // 4. Update React state immediately
      userRef.current = null;
      setUser(null);
      setNotifications([]);
      setPreviewPhotoURL(null);

      // 5. Notify all listeners and trigger navigation reset to home landing page
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('aver_nav_reset', { detail: { view: 'home' } }));

      // Immediately synchronize browser location to root '/'
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.replaceState({ id: 'root-home', view: 'home', tab: 'home' }, '', '/');
        } catch (e) {}
      }

      // 6. Sign out from Firebase Auth
      if (auth) {
        await signOut(auth).catch(() => {});
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [clearAllSubscriptions]);

  const addNotification = useCallback(async (
    category: NotificationCategory,
    priority: NotificationPriority,
    title: string,
    body: string,
    actionUrl?: string,
    action?: string,
    metadata?: Record<string, any>,
    userId?: string
  ) => {
    const targetUserId = userId || userRef.current?.uid;
    if (!targetUserId) return;

    // Check user's notification preferences before dispatching
    let notifPrefs: any = userRef.current?.notificationSettings;
    if (!notifPrefs && typeof window !== 'undefined') {
      try {
        const raw = safeStorage.getItem('aver_notifications');
        if (raw) notifPrefs = JSON.parse(raw);
      } catch (e) {}
    }

    if (notifPrefs) {
      if (notifPrefs.master === false) return;
      if (category === 'security' && notifPrefs.security === false) return;
      if (['account', 'profile'].includes(category) && notifPrefs.profile === false) return;
      if (category === 'deposit' && notifPrefs.deposits === false) return;
      if (category === 'withdrawal' && notifPrefs.withdrawals === false) return;
      if (['trading', 'portfolio', 'copy_trading', 'swap', 'ai'].includes(category) && notifPrefs.trading === false) return;
      if (['referral', 'vault', 'rewards'].includes(category) && notifPrefs.rewards === false) return;
      if (category === 'system' && notifPrefs.system === false) return;
      if (category === 'marketing' && notifPrefs.marketing === false) return;
    }

    const cleanTitle = (title || '').trim();
    const cleanBody = (body || '').trim();
    const notifKey = `${targetUserId}|${category}|${cleanTitle.toLowerCase()}|${cleanBody.toLowerCase()}`;
    const now = Date.now();

    // 5-second in-flight debounce check to stop duplicates across context
    const lastEmitted = recentNotificationTrackerRef.current.get(notifKey);
    if (lastEmitted && (now - lastEmitted) < 5000) {
      console.log("[AuthContext] Debounced duplicate notification:", notifKey);
      return;
    }
    recentNotificationTrackerRef.current.set(notifKey, now);

    const newNotif: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      category,
      priority,
      title: cleanTitle,
      body: cleanBody,
      read: false,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp: now,
      actionUrl: actionUrl || '',
      action: action || null,
      metadata: metadata || {},
      pinned: false,
      archived: false,
    };

    if (!auth.currentUser) {
      // Local state mutation
      let isDup = false;
      setUser(prev => {
        if (!prev) return null;
        const notifs = prev.notificationsList || [];
        isDup = notifs.some(n => {
          const sameText = n.category === category && n.title.trim().toLowerCase() === cleanTitle.toLowerCase() && n.body.trim().toLowerCase() === cleanBody.toLowerCase();
          const timeDiff = Math.abs((n.createdAtTimestamp || 0) - now);
          return sameText && timeDiff < 30000;
        });
        if (isDup) return prev;
        const updatedNotifs = [newNotif, ...notifs];
        const updated = { ...prev, notificationsList: updatedNotifs } as User;
        safeStorage.setItem('aver_active_user', JSON.stringify(updated));

        const dbList = getLocalDB();
        const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
        if (idx !== -1) {
          dbList[idx].profile = updated;
          saveLocalDB(dbList);
        }
        return updated;
      });
      if (isDup) return;
      setNotifications(prev => {
        if (prev.some(n => {
          const sameText = n.category === category && n.title.trim().toLowerCase() === cleanTitle.toLowerCase() && n.body.trim().toLowerCase() === cleanBody.toLowerCase();
          const timeDiff = Math.abs((n.createdAtTimestamp || 0) - now);
          return sameText && timeDiff < 30000;
        })) {
          return prev;
        }
        return [newNotif, ...prev];
      });
      return;
    }

    if (notificationManagerRef.current) {
      await notificationManagerRef.current.addNotification(category, priority, cleanTitle, cleanBody, actionUrl, action, metadata);
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string, readState?: boolean) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.map(n => n.id === id ? { ...n, read: readState !== undefined ? readState : !n.read } : n);
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: readState !== undefined ? readState : !n.read } : n));
        return;
      }

      try {
        if (notificationManagerRef.current) {
          await notificationManagerRef.current.markAsRead(id, readState);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.map(n => ({ ...n, read: true }));
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userRef.current.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const notifs = data.notificationsList || [];
          const updatedNotifs = notifs.map(n => ({ ...n, read: true }));
          await updateDoc(userDocRef, { notificationsList: updatedNotifs });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.filter(n => n.id !== id);
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.filter(n => n.id !== id));
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userRef.current.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const notifs = data.notificationsList || [];
          const updatedNotifs = notifs.filter(n => n.id !== id);
          await updateDoc(userDocRef, { notificationsList: updatedNotifs });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.filter(n => n.pinned);
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.filter(n => n.pinned));
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userRef.current.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const notifs = data.notificationsList || [];
          const updatedNotifs = notifs.filter(n => n.pinned); // Keep pinned ones
          await updateDoc(userDocRef, { notificationsList: updatedNotifs });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const pinNotification = useCallback(async (id: string) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userRef.current.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const notifs = data.notificationsList || [];
          const updatedNotifs = notifs.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
          await updateDoc(userDocRef, { notificationsList: updatedNotifs });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const archiveNotification = useCallback(async (id: string) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const notifs = prev.notificationsList || [];
          const updatedNotifs = notifs.map(n => n.id === id ? { ...n, archived: !n.archived } : n);
          const updated = { ...prev, notificationsList: updatedNotifs } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: !n.archived } : n));
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userRef.current.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const notifs = data.notificationsList || [];
          const updatedNotifs = notifs.map(n => n.id === id ? { ...n, archived: !n.archived } : n);
          await updateDoc(userDocRef, { notificationsList: updatedNotifs });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userRef.current.uid}`);
      }
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        throw new Error("No internet connection. Please reconnect and try again.");
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        return; // Resolve successfully to prevent email enumeration
      }
      throw new Error("Unable to send the reset email right now. Please try again later.");
    }
  }, []);

  const updateOnboarding = useCallback(async (completed: boolean) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const updated = { ...prev, onboardingCompleted: completed, lastUpdated: new Date().toISOString() } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });
        if (completed) {
          await addNotification(
            'account',
            'medium',
            'Onboarding Completed',
            'Thank you for completing your account onboarding! Your profile is now fully verified and prepared for standard trading activities.'
          );
        }
        return;
      }

      const userDocRef = doc(db, 'users', userRef.current.uid);
      await updateDoc(userDocRef, { 
        onboardingCompleted: completed,
        lastUpdated: serverTimestamp()
      });
      if (completed) {
        await addNotification(
          'account',
          'medium',
          'Onboarding Completed',
          'Thank you for completing your account onboarding! Your profile is now fully verified and prepared for standard trading activities.'
        );
      }
    }
  }, [addNotification]);

function dataURLtoBlob(dataurl: string): Blob {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error("[AuthContext] Error in dataURLtoBlob conversion:", err);
    throw new Error("Failed to process cropped image data format.");
  }
}

   const updateProfilePhoto = useCallback(async (file: File | string | null) => {
    console.log("[AuthContext] updateProfilePhoto called with type:", typeof file);
    if (userRef.current) {
      const uid = userRef.current.uid;
      const userDocRef = doc(db, 'users', uid);

      try {
        if (!auth.currentUser) {
          console.log("[AuthContext] updateProfilePhoto: No current auth user, using local persistence");
          let photoURL = "";
          if (typeof file === 'string') {
            photoURL = file;
          } else if (file instanceof File) {
            photoURL = URL.createObjectURL(file);
          }
          
          setUser(prev => {
            if (!prev) return null;
            const updated = { 
              ...prev, 
              profilePhotoURL: photoURL, 
              avatarUrl: photoURL, 
              hasCustomPhoto: !!photoURL, 
              lastUpdated: new Date().toISOString() 
            } as User;
            
            try {
              safeStorage.setItem('aver_active_user', JSON.stringify(updated));
              safeStorage.setItem(`user_profile_${uid}`, JSON.stringify(updated));
            } catch (storageErr) {
              console.warn("[AuthContext] Failed to cache user profile in safeStorage (quota exceeded fallback):", storageErr);
            }

            try {
              const dbList = getLocalDB();
              const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
              if (idx !== -1) { 
                dbList[idx].profile = updated; 
                saveLocalDB(dbList); 
              }
            } catch (dbErr) {
              console.warn("[AuthContext] Failed to save updated profile to local database:", dbErr);
            }
            return updated;
          });
          
          setPreviewPhotoURL(null);
          await addNotification(
            'account',
            'low',
            'Profile Picture Changed',
            'Your profile picture has been successfully updated.'
          );
          return;
        }

        if (file === null) {
          safeStorage.removeItem(`aver_custom_photo_${uid}`);
          safeStorage.removeItem('aver_last_custom_photo');
          await updateDoc(userDocRef, {
            profilePhotoURL: "",
            avatarUrl: "",
            hasCustomPhoto: false,
            lastUpdated: serverTimestamp()
          });
          setUser(prev => prev ? { ...prev, profilePhotoURL: "", avatarUrl: "", hasCustomPhoto: false } : null);
          setPreviewPhotoURL(null);
          await addNotification(
            'account',
            'low',
            'Profile Picture Removed',
            'Your profile picture has been successfully removed.'
          );
          return;
        }

        let photoURL = "";
        if (typeof file === 'string') {
          if (file.startsWith('blob:')) {
            console.log("[AuthContext] updateProfilePhoto: Handling blob URL for preview");
            setPreviewPhotoURL(file);
            return;
          }

          try {
            const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);
            const blob = dataURLtoBlob(file);
            const uploadPromise = uploadBytes(storageRef, blob).then(() => getDownloadURL(storageRef));
            const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Storage upload timeout")), 4000));
            photoURL = await Promise.race([uploadPromise, timeoutPromise]);
          } catch (uploadErr) {
            console.warn("[AuthContext] Storage upload failed or timed out, using data URL fallback:", uploadErr);
            photoURL = file;
          }
        } else {
          try {
            const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);
            const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
            const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Storage upload timeout")), 4000));
            photoURL = await Promise.race([uploadPromise, timeoutPromise]);
          } catch (uploadErr) {
            console.warn("[AuthContext] File upload failed or timed out:", uploadErr);
            const reader = new FileReader();
            photoURL = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });
          }
        }

        if (photoURL) {
          console.log("[AuthContext] updateProfilePhoto: Updating Firestore doc");
          // Update Firestore and also update the local state immediately for responsiveness
          const updates = { 
            profilePhotoURL: photoURL,
            avatarUrl: photoURL,
            hasCustomPhoto: true,
            lastUpdated: serverTimestamp()
          };

          await updateDoc(userDocRef, updates);
          console.log("[AuthContext] updateProfilePhoto: Firestore update successful");
          
          // Force an immediate UI update before the snapshot listener triggers
          setUser(prev => {
            if (!prev) return null;
            const updated = { 
              ...prev, 
              profilePhotoURL: photoURL,
              avatarUrl: photoURL,
              hasCustomPhoto: true, 
              lastUpdated: new Date().toISOString() 
            } as User;
            try {
              safeStorage.setItem(`aver_custom_photo_${uid}`, photoURL);
              safeStorage.setItem('aver_last_custom_photo', photoURL);
              safeStorage.setItem(`user_profile_${uid}`, JSON.stringify(updated));
              safeStorage.setItem('aver_active_user', JSON.stringify(updated));
            } catch (storageErr) {
              console.warn("[AuthContext] Failed to cache user profile in safeStorage (quota exceeded fallback):", storageErr);
            }
            return updated;
          });

          setPreviewPhotoURL(null);

          await addNotification(
            'account',
            'low',
            'Profile Picture Changed',
            'Your profile picture has been successfully updated.'
          );
        }
      } catch (err: any) {
        console.error("[AuthContext] CRITICAL ERROR in updateProfilePhoto:", err);
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/profile_photo`);
        } else {
          throw err;
        }
      }
    }
  }, [addNotification]);

  const updateUserPreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    if (userRef.current) {
      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const updates: any = {};
          if (prefs.theme) updates.theme = prefs.theme;
          if (prefs.language) updates.preferredLanguage = prefs.language;
          if (prefs.currency) updates.currency = prefs.currency;
          if (prefs.notifications) updates.notificationSettings = prefs.notifications;
          if (prefs.biometricsEnabled !== undefined) updates.biometricEnabled = prefs.biometricsEnabled;
          if (prefs.rememberMeEnabled !== undefined) updates.rememberMeEnabled = prefs.rememberMeEnabled;
          if (prefs.twoFactorEnabled !== undefined) updates.twoFactorEnabled = prefs.twoFactorEnabled;
          if (prefs.twoFactorSecret !== undefined) updates.twoFactorSecret = prefs.twoFactorSecret;
          if (prefs.twoFactorEnabledAt !== undefined) updates.twoFactorEnabledAt = prefs.twoFactorEnabledAt;
          if (prefs.twoFactorBackupCodes !== undefined) updates.twoFactorBackupCodes = prefs.twoFactorBackupCodes;

          const updated = { ...prev, ...updates, lastUpdated: new Date().toISOString() } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }
          return updated;
        });

        if (prefs.twoFactorEnabled !== undefined) {
          await addNotification(
            'security',
            'medium',
            'Two-Factor Authentication Updated',
            `Two-factor authentication has been ${prefs.twoFactorEnabled ? 'enabled' : 'disabled'} for your account.`
          );
        }
        return;
      }

      const userDocRef = doc(db, 'users', userRef.current.uid);
      const updates: any = {
        lastUpdated: serverTimestamp()
      };
      
      if (prefs.theme) updates.theme = prefs.theme;
      if (prefs.language) updates.preferredLanguage = prefs.language;
      if (prefs.currency) updates.currency = prefs.currency;
      if (prefs.notifications) updates.notificationSettings = prefs.notifications;
      if (prefs.biometricsEnabled !== undefined) updates.biometricEnabled = prefs.biometricsEnabled;
      if (prefs.rememberMeEnabled !== undefined) updates.rememberMeEnabled = prefs.rememberMeEnabled;
      if (prefs.twoFactorEnabled !== undefined) updates.twoFactorEnabled = prefs.twoFactorEnabled;
      if (prefs.twoFactorSecret !== undefined) updates.twoFactorSecret = prefs.twoFactorSecret;
      if (prefs.twoFactorEnabledAt !== undefined) updates.twoFactorEnabledAt = prefs.twoFactorEnabledAt;
      if (prefs.twoFactorBackupCodes !== undefined) updates.twoFactorBackupCodes = prefs.twoFactorBackupCodes;

      await updateDoc(userDocRef, updates);

      setUser(prev => {
        if (!prev) return null;
        return { ...prev, ...updates, lastUpdated: new Date().toISOString() } as User;
      });

      if (prefs.twoFactorEnabled !== undefined) {
        await addNotification(
          'security',
          'medium',
          'Two-Factor Authentication Updated',
          `Two-factor authentication has been ${prefs.twoFactorEnabled ? 'enabled' : 'disabled'} for your account.`
        );
      }
    }
  }, [addNotification]);

   const addDeposit = useCallback(async (amount: number) => {
    if (userRef.current) {
      const txHash = '0x' + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
      const dateStr = new Date().toISOString();
      const depositId = 'dep-' + Date.now();
      
      const newDeposit: DepositItem = {
        id: depositId,
        amount,
        txHash,
        status: 'Pending',
        date: dateStr,
      };

      const newHistoryItem: HistoryItem = {
        id: 'hist-' + Date.now(),
        type: 'deposit',
        amount,
        valueUsd: amount,
        date: dateStr,
        status: 'Pending',
      };

      if (!auth.currentUser) {
        setUser(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            deposits: [newDeposit, ...(prev.deposits || [])],
            history: [newHistoryItem, ...(prev.history || [])],
            lastUpdated: new Date().toISOString()
          } as User;
          safeStorage.setItem('aver_active_user', JSON.stringify(updated));

          const dbList = getLocalDB();
          const idx = dbList.findIndex(u => u.email.toLowerCase() === prev.email.toLowerCase());
          if (idx !== -1) { dbList[idx].profile = updated; saveLocalDB(dbList); }

          return updated;
        });

        await addNotification('deposit', 'medium', 'Deposit Submitted', `Your deposit of $${amount.toLocaleString()} is pending approval.`);
        return;
      }

      const userDocRef = doc(db, 'users', userRef.current.uid);
      await updateDoc(userDocRef, {
        deposits: arrayUnion(newDeposit),
        history: arrayUnion(newHistoryItem),
        lastUpdated: serverTimestamp()
      });

      try {
        const adminDepositRef = doc(collection(db, 'admin_deposits'), depositId);
        await setDoc(adminDepositRef, {
          id: depositId,
          userId: userRef.current.uid,
          email: userRef.current.email,
          amount: amount,
          txHash: txHash,
          status: 'pending',
          createdAt: serverTimestamp(),
          fundingMethod: 'crypto',
        });
      } catch (err) {
        console.warn("Failed to create admin deposit:", err);
      }

      setUser(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          deposits: [newDeposit, ...(prev.deposits || [])],
          history: [newHistoryItem, ...(prev.history || [])],
          lastUpdated: new Date().toISOString()
        } as User;
        safeStorage.setItem(`user_profile_${prev.uid}`, JSON.stringify(updated));
        safeStorage.setItem('aver_active_user', JSON.stringify(updated));
        return updated;
      });

      await addNotification('deposit', 'medium', 'Deposit Submitted', `Your deposit of $${amount.toLocaleString()} has been submitted and is pending admin approval.`);
    }
  }, [addNotification]);

  const addWithdrawal = useCallback(async (amount: number, destination?: string, asset: string = 'USDT', network: string = 'TRC20') => {
    if (userRef.current) {
      const u = userRef.current;
      const availBal = Math.max(
        Number(u.portfolioBalance) || 0,
        Number(u.availableBalance) || 0,
        Number(u.cashBalance) || 0,
        Number(u.tokenBalance) || 0,
        Number((u as any).balance) || 0
      );

      if (amount > 9000000) {
        throw new Error("Transaction limit exceeded. Maximum withdrawal limit per transaction is $9,000,000.");
      }
      if (availBal < amount && availBal > 0) {
        throw new Error("Insufficient funds available for withdrawal.");
      }

      const txId = `wth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const refId = 'WTH-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const txHash = '0x' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
      const timestamp = new Date().toISOString();

      const assetPrices: Record<string, number> = { BTC: 64000, ETH: 3400, SOL: 145, BNB: 580, AVR: 1.2, USDT: 1, USDC: 1, USD: 1 };
      const cleanAsset = (asset || 'USDT').split('-')[0].toUpperCase();
      const tokenPrice = assetPrices[cleanAsset] || 64000;
      const cryptoAmount = cleanAsset === 'USDT' || cleanAsset === 'USDC' || cleanAsset === 'USD'
        ? amount
        : Number((amount / tokenPrice).toFixed(6));

      // 1. Save to admin_withdrawals and withdrawals collections for Admin Governance
      const withdrawalData = {
        id: txId,
        refId,
        userId: userRef.current.uid,
        email: userRef.current.email || '',
        userName: userRef.current.displayName || userRef.current.username || 'User',
        amount,
        cryptoAmount,
        cryptoSymbol: cleanAsset,
        asset: cleanAsset,
        symbol: cleanAsset,
        network: network || 'TRC20',
        destination: destination || 'N/A',
        destinationAddress: destination || 'N/A',
        txHash,
        status: 'pending',
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      try {
        await setDoc(doc(db, 'admin_withdrawals', txId), {
          ...withdrawalData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Firestore admin_withdrawals write error:", e);
      }

      try {
        await setDoc(doc(db, 'withdrawals', txId), {
          ...withdrawalData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Firestore withdrawals write error:", e);
      }

      // 2. Record in Transaction History collection immediately
      try {
        await transactionService.recordTransaction({
          id: txId,
          userId: userRef.current.uid,
          type: 'withdrawal',
          category: 'transactions',
          title: `${cleanAsset} Withdrawal`,
          amount: -amount, // Negative for withdrawal
          asset: cleanAsset,
          cryptoAmount: -cryptoAmount,
          cryptoSymbol: cleanAsset,
          network: network || 'TRC20',
          destination: destination || 'N/A',
          status: 'Pending',
          timestamp,
          txHash,
          refId
        });
      } catch (e) {
        console.warn("Failed to record withdrawal in transactions history:", e);
      }

      // Update user doc in Firestore - STATUS ONLY, NO BALANCE DEDUCTION
      if (!userRef.current.uid.startsWith('local-')) {
        await updateDoc(doc(db, 'users', userRef.current.uid), {
          withdrawals: arrayUnion({
            id: txId,
            refId,
            amount,
            cryptoAmount,
            cryptoSymbol: cleanAsset,
            asset: cleanAsset,
            network: network || 'TRC20',
            destination: destination || 'N/A',
            status: 'Pending',
            timestamp,
            date: timestamp,
            txHash
          }),
          lastUpdated: serverTimestamp()
        }).catch(() => {});
      }

      // Update local state and safeStorage
      const currentWithdrawals = userRef.current.withdrawals || [];
      const updatedUser = {
        ...userRef.current,
        withdrawals: [
          ...currentWithdrawals,
          {
            id: txId,
            refId,
            amount,
            cryptoAmount,
            cryptoSymbol: cleanAsset,
            asset: cleanAsset,
            network: network || 'TRC20',
            destination: destination || 'N/A',
            status: 'Pending',
            timestamp,
            date: timestamp,
            txHash
          }
        ]
      };
      setUser(updatedUser as any);
      userRef.current = updatedUser as any;
      safeStorage.setItem('aver_active_user', JSON.stringify(updatedUser));
      safeStorage.setItem(`user_profile_${userRef.current.uid}`, JSON.stringify(updatedUser));

      window.dispatchEvent(new CustomEvent('aver_transaction_created', { detail: txId }));
      window.dispatchEvent(new CustomEvent('withdrawal_updated', { detail: txId }));
      window.dispatchEvent(new Event('aver_user_updated'));
      window.dispatchEvent(new Event('storage'));
      
      await addNotification('withdrawal', 'high', 'Withdrawal Request Submitted', `Your withdrawal of $${amount.toLocaleString()} is under review by admin.`).catch(() => {});
      return { id: txId, refId, txHash };
    }
  }, [addNotification]);

  const updateProfile = useCallback(async (dataOrDisplayName: Partial<User> | string, username?: string, email?: string, silent?: boolean) => {
    if (userRef.current) {
      let updates: any = {};
      if (typeof dataOrDisplayName === 'string') {
        updates.displayName = dataOrDisplayName;
        if (username) updates.username = username;
        if (email) updates.email = email;
      } else {
        updates = { ...dataOrDisplayName };
      }

      const oldProfile = userRef.current;
      const updatedUser = {
        ...oldProfile,
        ...updates,
        lastUpdated: new Date().toISOString()
      } as User;

      // 1. Optimistically update local React state and cache storage
      userRef.current = updatedUser;
      setUser(updatedUser);
      safeStorage.setItem(`user_profile_${oldProfile.uid}`, JSON.stringify(updatedUser));
      safeStorage.setItem('aver_active_user', JSON.stringify(updatedUser));

      if (!auth.currentUser) {
        const dbList = getLocalDB();
        const idx = dbList.findIndex(u => u.email.toLowerCase() === oldProfile.email.toLowerCase());
        if (idx !== -1) { 
          dbList[idx].profile = updatedUser; 
          saveLocalDB(dbList); 
        }
      } else {
        // 2. Try updating Firestore, but catch write quota errors/exceptions to allow local persistence
        const userDocRef = doc(db, 'users', oldProfile.uid);
        try {
          const firestoreUpdates = {
            ...updates,
            lastUpdated: serverTimestamp()
          };
          await updateDoc(userDocRef, firestoreUpdates);
        } catch (err) {
          console.warn("[AuthContext] Firestore update failed (using local fallback):", err);
        }
      }

      if (!silent) {
        let body = 'Your profile information has been successfully updated.';
        if (email && email !== oldProfile.email) {
          body = 'Your email address has been successfully updated.';
        }

        await addNotification(
          'account',
          'medium',
          'Profile Updated',
          body
        ).catch(() => {});
      }
    }
  }, [addNotification]);

  const updateTradingConfig = useCallback(async (config: Partial<TradingEngineConfig>) => {
    if (!userRef.current) return;
    try {
      const configRef = doc(db, 'users', userRef.current.uid, 'tradingConfig', 'default');
      await updateDoc(configRef, { ...config, lastUpdated: serverTimestamp() });
    } catch (err) {
      console.error("Error updating trading config:", err);
    }
  }, []);

  const toggleWatchlist = useCallback(async (symbol: string) => {
    if (!userRef.current) return;
    try {
      const watchlist = userRef.current.watchlist || [];
      const newWatchlist = watchlist.includes(symbol)
        ? watchlist.filter(s => s !== symbol)
        : [...watchlist, symbol];
      
      const updated = {
        ...userRef.current,
        watchlist: newWatchlist
      };

      // Always update local state first for instant UX
      setUser(updated);
      safeStorage.setItem('aver_active_user', JSON.stringify(updated));

      // Also update the local database if running locally/fallback
      const dbList = getLocalDB();
      const localIdx = dbList.findIndex(u => u.email.toLowerCase() === userRef.current!.email.toLowerCase());
      if (localIdx !== -1) {
        dbList[localIdx].profile = updated;
        saveLocalDB(dbList);
      }

      // If registered with Firebase, sync to Firestore
      if (!userRef.current.uid.startsWith('local-')) {
        await updateDoc(doc(db, 'users', userRef.current.uid), {
          watchlist: newWatchlist
        });
      }
    } catch (err) {
      console.error("Error updating watchlist:", err);
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const { updatePassword } = await import('firebase/auth');
        await updatePassword(firebaseUser, newPassword);
        
        await addNotification(
          'security',
          'high',
          'Password Changed',
          'Your account password has been successfully changed. If you did not perform this action, please contact support immediately.'
        );
      } catch (err: any) {
        console.error("Error changing password:", err);
        throw err;
      }
    } else {
      // Local password change
      if (userRef.current) {
        const dbList = getLocalDB();
        const idx = dbList.findIndex(u => u.email.toLowerCase() === userRef.current!.email.toLowerCase());
        if (idx !== -1) {
          dbList[idx].password = newPassword;
          saveLocalDB(dbList);
        }
        await addNotification(
          'security',
          'high',
          'Password Changed',
          'Your account password has been successfully changed. If you did not perform this action, please contact support immediately.'
        );
      }
    }
  }, [addNotification]);

  const verifyCurrentPassword = useCallback(async (password: string) => {
    if (!auth.currentUser) {
      if (userRef.current) {
        const dbList = getLocalDB();
        const record = dbList.find(u => u.email.toLowerCase() === userRef.current!.email.toLowerCase());
        return record ? record.password === password : false;
      }
      return false;
    }
    return true; // Simplified/auto-approved for cloud flow
  }, []);

  const resetAllFinancialData = useCallback(async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batchPromises = usersSnap.docs.map(async (userDoc) => {
        const uid = userDoc.id;
        const uRef = doc(db, 'users', uid);
        await updateDoc(uRef, {
          portfolioBalance: 0,
          availableBalance: 0,
          vaultBalance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalProfit: 0,
          totalLoss: 0,
          deposits: [],
          withdrawals: [],
          history: [],
          trades: [],
          holdings: [],
          snapshots: [],
          notificationsList: [],
          portfolio: {
            totalValue: 0,
            todayPnL: 0,
            todayPnLPercent: 0,
            overallReturn: 0,
            realizedPnL: 0,
            unrealizedPnL: 0,
            healthScore: 100,
            diversificationScore: 100,
            volatility: 0,
            sharpeRatio: 0,
            winRate: 0,
            maxDrawdown: 0,
            recoveryFactor: 0,
            riskAdjustedReturn: 0
          }
        });

        for (const subcol of ['trades', 'holdings', 'snapshots', 'activity', 'positions', 'aiConfigurations']) {
          try {
            const subSnap = await getDocs(collection(db, 'users', uid, subcol));
            await Promise.all(subSnap.docs.map(d => deleteDoc(d.ref)));
          } catch (e) {
            console.warn(`Failed to clear subcollection ${subcol} for user ${uid}:`, e);
          }
        }
      });

      await Promise.all(batchPromises);

      for (const colName of ['admin_deposits', 'admin_withdrawals', 'transactions', 'user_transactions', 'aiSessions', 'aiRecommendations', 'linked_wallets', 'user_wallets']) {
        try {
          const colSnap = await getDocs(collection(db, colName));
          await Promise.all(colSnap.docs.map(d => deleteDoc(d.ref)));
        } catch (e) {
          console.warn(`Failed to clear global collection ${colName}:`, e);
        }
      }

      // Clear all local storage keys related to financials, wallets, transactions, deposits, withdrawals, trades, portfolios
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.includes('aver_') ||
            k.includes('wallet') ||
            k.includes('transaction') ||
            k.includes('deposit') ||
            k.includes('withdrawal') ||
            k.includes('trade') ||
            k.includes('portfolio') ||
            k.includes('vault') ||
            k.includes('holding') ||
            k.includes('snapshot') ||
            k.includes('activity') ||
            k.includes('session') ||
            k.includes('recommendation')
          )) {
            // Keep auth token/session if needed, but wipe financial keys
            if (k !== 'firebase:authUser:' && !k.startsWith('firebase:')) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn("Error clearing financial local storage keys:", e);
      }

      safeStorage.removeItem('aver_admin_deposits_local');
      safeStorage.removeItem('aver_admin_withdrawals_local');
      safeStorage.removeItem('aver_transactions_local');
      safeStorage.removeItem('portfolio_vault_balance');

      if (userRef.current) {
        const resetUser: User = {
          ...userRef.current,
          portfolioBalance: 0,
          availableBalance: 0,
          vaultBalance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalProfit: 0,
          totalLoss: 0,
          deposits: [],
          withdrawals: [],
          history: [],
          trades: [],
          holdings: [],
          snapshots: [],
          notificationsList: [],
          portfolio: {
            totalValue: 0,
            todayPnL: 0,
            todayPnLPercent: 0,
            overallReturn: 0,
            realizedPnL: 0,
            unrealizedPnL: 0,
            healthScore: 100,
            diversificationScore: 100,
            volatility: 0,
            sharpeRatio: 0,
            winRate: 0,
            maxDrawdown: 0,
            recoveryFactor: 0,
            riskAdjustedReturn: 0
          }
        };
        setUser(resetUser);
        safeStorage.setItem('aver_active_user', JSON.stringify(resetUser));
        safeStorage.setItem(`user_profile_${resetUser.uid}`, JSON.stringify(resetUser));
      }

      console.log("All account financial data successfully reset.");
    } catch (err) {
      console.error("Error resetting all financial data:", err);
      throw err;
    }
  }, []);

  const contextValue = useMemo(() => ({
    user: userWithPreview,
    loading,
    notifications,
    signOutUser,
    signUp,
    signIn,
    forgotPassword,
    updateOnboarding,
    updateProfilePhoto,
    updateUserPreferences,
    updateTradingConfig,
    toggleWatchlist,
    addDeposit,
    addWithdrawal,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
    pinNotification,
    archiveNotification,
    updateProfile,
    changePassword,
    verifyCurrentPassword,
    resetAllFinancialData,
  }), [
    userWithPreview,
    loading,
    notifications,
    signOutUser,
    signUp,
    signIn,
    forgotPassword,
    updateOnboarding,
    updateProfilePhoto,
    updateUserPreferences,
    updateTradingConfig,
    toggleWatchlist,
    addDeposit,
    addWithdrawal,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
    pinNotification,
    archiveNotification,
    updateProfile,
    changePassword,
    verifyCurrentPassword,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
