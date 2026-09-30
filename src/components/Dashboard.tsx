import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
  Brain, Activity, Star, Newspaper, Zap, ArrowRightLeft, 
  Copy, History, CreditCard, ChevronRight, Bell, X, ShieldCheck,
  Award, AlertCircle, CheckCircle2, Lock, Flame, Trash2, MessageSquare
} from 'lucide-react';
import { useSupportUnread } from '../hooks/useSupportUnread';
import BottomNavigation from './BottomNavigation';
import CoinLogo from './CoinLogo';
import ProfileView from './ProfileView';
import MarketsPage from './MarketsPage';
import DiscoverView from './DiscoverView';
import CoinDetailsPage from './CoinDetailsPage';
import PortfolioViewV2 from './portfolio_v2/PortfolioViewV2';
import AiTradingModule from './AiTradingModule';
import CopyTrading from './CopyTrading/CopyTrading';
import InstitutionalDepositPage from './deposit/InstitutionalDepositPage';
import InstitutionalWithdrawalPage from './withdrawal/InstitutionalWithdrawalPage';

import { saveSupportTicket } from '../lib/supportStore';
import { NotificationCenter } from './NotificationCenter';
import { ExploreStrategiesModal } from './ExploreStrategiesModal';
import EventsPromosPage from './EventsPromosPage';
import SupportCenterPage from './SupportCenterPage';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import UserAvatar from './UserAvatar';
import AverLogo from './AverLogo';
import { DashboardIcon, WalletIcon, TradesIcon, AnalyticsIcon } from './CustomIcons';
import { TradingEngineContext } from '../contexts/TradingEngineContext';









import { useFinancials } from '../hooks/useFinancials';
import { safeStorage } from '../utils/storage';
import { portfolioPersistenceService } from '../services/portfolioPersistenceService';
import { walletService, WalletData } from '../services/walletService';
import { useAppNavigation } from '../contexts/NavigationContext';

export default function Dashboard({ theme, onNavigate }: { theme: 'light' | 'dark', onNavigate: (view: 'referral-centre' | 'preferences' | 'bonus-center' | 'market-highlights' | 'events-promos' | 'strategies' | 'history') => void }) {
  const { user, loading: authLoading, notifications, addDeposit, addWithdrawal, clearNotifications } = useAuth();
  const { preferences, t, formatCurrency } = usePreferences();
  const { activity, trades, liveTradePrices, session, completedSessions, saveConfiguration, config: currentConfig, clearActivityHistory } = useContext(TradingEngineContext);

  const handleSelectStrategy = async (strategy: any) => {
    let tradingStrategy: 'NEURAL_MOMENTUM' | 'VOLATILITY_BREAKOUT' | 'MEAN_REVERSION' | 'QUANT_GRID' = 'NEURAL_MOMENTUM';
    if (strategy.category === 'Breakout') tradingStrategy = 'VOLATILITY_BREAKOUT';
    else if (strategy.category === 'Grid') tradingStrategy = 'QUANT_GRID';
    else if (strategy.category === 'Mean Reversion') tradingStrategy = 'MEAN_REVERSION';

    // Parse capital allocation string (e.g., "80% active trading" or "$1,000")
    let capitalAmount = Math.floor(Math.random() * 3000) + 1500;
    if (strategy.recommendedAiConfig?.capitalAllocation) {
      const match = strategy.recommendedAiConfig.capitalAllocation.match(/(\d+)/);
      if (match) capitalAmount = Math.max(500, parseInt(match[1]) * 10);
    }

    const minConf = strategy.aiConfidence ? parseInt(strategy.aiConfidence) : (Math.floor(Math.random() * 10) + 85);

    const assets = strategy.supportedAssets
      ? strategy.supportedAssets.map((a: string) => a.split('/')[0])
      : ['BTC', 'ETH', 'SOL'];

    const configId = `cfg_strat_${Date.now()}`;
    const baseConfig = currentConfig || {
      id: configId,
      ownerId: user?.uid || 'guest_user',
      name: `${strategy.name}`,
      createdAt: { toDate: () => new Date() } as any,
      lastModified: { toDate: () => new Date() } as any,
      status: 'INACTIVE',
      sessionSetup: { amountToAllocate: capitalAmount, fundingSource: 'WALLET', sessionDuration: 24 },
      profitRiskManagement: { sessionTakeProfit: 8, sessionStopLoss: 2, maxRiskPerTrade: 1, maxPositionSize: 500 },
      aiTradingRules: { minConfidence: minConf, maxSimultaneousPositions: 3, assetSelection: assets, tradingStrategy },
      configurationDetails: { description: strategy.description || '', category: strategy.category || 'Scalping', version: '1.0.0' },
      analyticsAndNotes: { riskScore: 50, strategyNotes: '', performanceStats: { winRate: 85, totalReturn: 42, drawdown: 3.5 }, executionHistory: [] },
      notificationPreferences: { newRecommendations: true, tradeExecutions: true, marketAlerts: false },
      schedule: { enabled: false, operatingWindows: [], coolingBreaks: [], marketCalendar: { Stocks: { excludeHolidays: true }, Forex: { excludeHolidays: true }, Crypto: { excludeHolidays: false }, Indices: { excludeHolidays: true }, Commodities: { excludeHolidays: true } }, monitorOutsideWindow: true }
    };

    const updatedConfig = {
      ...baseConfig,
      id: `cfg_strat_${Date.now()}`,
      name: `${strategy.name} (${assets.slice(0, 2).join('/')})`,
      sessionSetup: {
        ...baseConfig.sessionSetup,
        amountToAllocate: capitalAmount,
        sessionDuration: [12, 24, 48, 72][Math.floor(Math.random() * 4)],
      },
      profitRiskManagement: {
        ...baseConfig.profitRiskManagement,
        sessionTakeProfit: Math.abs(parseFloat(strategy.apy) || 15),
        sessionStopLoss: Math.abs(parseFloat(strategy.maxDrawdown) || 5),
        maxRiskPerTrade: strategy.riskLevel === 'Low' ? 1.5 : strategy.riskLevel === 'Medium' ? 3 : 5,
      },
      aiTradingRules: {
        ...baseConfig.aiTradingRules,
        tradingStrategy,
        minConfidence: minConf,
        assetSelection: assets,
      },
      configurationDetails: {
        ...baseConfig.configurationDetails,
        description: `${strategy.description}\n\n[Implementation Logic]: ${strategy.howItWorks}`,
        category: strategy.category,
      },
      analyticsAndNotes: {
        ...baseConfig.analyticsAndNotes,
        riskScore: strategy.riskLevel === 'Low' ? 25 : strategy.riskLevel === 'Medium' ? 55 : 85,
        strategyNotes: `Deployed Strategy: ${strategy.name}\n` +
          `• Implementation: ${strategy.howItWorks}\n` +
          `• Timeframes: ${strategy.timeframes?.join(', ') || '15m, 1h'}\n` +
          `• Execution Frequency: ${strategy.recommendedAiConfig?.frequency || 'Adaptive'}\n` +
          `• Stop Loss Rule: ${strategy.recommendedAiConfig?.stopLoss || 'Dynamic Trailing'}\n` +
          `• Position Sizing: ${strategy.recommendedAiConfig?.positionSizing || '15% per trade'}\n` +
          `• Expected Behavior: ${strategy.expectedBehavior}\n` +
          `• Key Advantages: ${strategy.advantages?.join(', ')}`,
        performanceStats: {
          winRate: parseFloat(strategy.successRate) || 88,
          totalReturn: parseFloat(strategy.apy) || 42,
          drawdown: parseFloat(strategy.maxDrawdown) || 3.8
        }
      }
    };
    
    await saveConfiguration(updatedConfig);
  };
  const isDark = preferences.theme === 'dark';
  
  const enrichedActiveTrades = useMemo(() => trades.filter(t => t.status === 'OPEN').map(trade => {
    const livePrice = liveTradePrices[trade.id] || trade.currentPrice || trade.entry;
    return { ...trade, pnl: (livePrice - trade.entry) * trade.quantity };
  }), [trades, liveTradePrices]);

  const totalFloatingPnl = useMemo(() => enrichedActiveTrades.reduce((sum, t) => sum + (t.pnl || 0), 0), [enrichedActiveTrades]);

  const { currentLocation, navigate, navigateTab: navTab, navigateView, goBack, openModal, closeModal } = useAppNavigation();
  const activeTab = currentLocation.tab || 'home';

  const navigateTab = useCallback((tab: string, options?: { asset?: string }) => {
    navTab(tab, options);
  }, [navTab]);

  const goBackTab = useCallback(() => {
    goBack();
  }, [goBack]);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [portfolioViewMode, setPortfolioViewMode] = useState<any>('overview');
  const [showClearTimelineModal, setShowClearTimelineModal] = useState(false);

  const handleOpenWithdraw = useCallback(() => {
    setAmount('');
    setTxError('');
    setTxSuccess('');
    setShowWithdrawModal(true);
    openModal('withdraw');
  }, [openModal]);

  const handleCloseWithdraw = useCallback(() => {
    setShowWithdrawModal(false);
    if (currentLocation.view === 'withdraw' || currentLocation.view === 'withdrawal') {
      navigate({ view: 'dashboard', modal: null });
    } else {
      closeModal();
    }
  }, [closeModal, currentLocation.view, navigate]);

  const handleOpenDeposit = useCallback(() => {
    setShowDepositModal(true);
    openModal('deposit');
  }, [openModal]);

  const handleCloseDeposit = useCallback(() => {
    setShowDepositModal(false);
    if (currentLocation.view === 'deposit') {
      navigate({ view: 'dashboard', modal: null });
    } else {
      closeModal();
    }
  }, [closeModal, currentLocation.view, navigate]);
  const watchlist = useMemo(() => {
    if (user?.holdings && user.holdings.length > 0) {
      return user.holdings.map((h: any) => {
        const livePrice = liveTradePrices[h.ticker || h.symbol] || h.currentPrice || h.price || 0;
        const change = h.change || 0;
        return {
          symbol: h.ticker || h.symbol,
          price: livePrice,
          change: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
          isPositive: change >= 0
        };
      });
    }
    return [
      { symbol: 'BTC', price: 64230, change: '+2.45%', isPositive: true },
      { symbol: 'ETH', price: 3450, change: '+1.82%', isPositive: true },
      { symbol: 'SOL', price: 145, change: '-0.52%', isPositive: false }
    ];
  }, [user?.holdings, liveTradePrices]);

  const handleNavigate = useCallback((tab: string) => {
    navigateTab(tab);
  }, [navigateTab]);

  const handleViewModeChange = useCallback((mode: any) => {
    setPortfolioViewMode(mode);
  }, []);

  const [selectedAssetLocal, setSelectedAssetLocal] = useState('BTC');
  const selectedAsset = currentLocation.asset || selectedAssetLocal;
  const setSelectedAsset = setSelectedAssetLocal;

  const [marketData, setMarketData] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [aiSignals, setAiSignals] = useState<any[]>([]);

  const fetchMarketData = async () => {
    try {
      setMarketLoading(true);
      const res = await fetch('/api/market/ticker');
      if (!res.ok) throw new Error('Failed to fetch market data');
      const data = await res.json();
      const mapped = data.map((d: any) => {
        const symbol = d.symbol.replace('USDT', '');
        const isPositive = parseFloat(d.priceChangePercent) >= 0;
        return {
          symbol,
          name: symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : symbol === 'ADA' ? 'Cardano' : symbol === 'XRP' ? 'Ripple' : symbol === 'SOL' ? 'Solana' : symbol === 'DOGE' ? 'Dogecoin' : symbol === 'AVAX' ? 'Avalanche' : 'Chainlink',
          price: parseFloat(d.lastPrice),
          change: (isPositive ? '+' : '') + parseFloat(d.priceChangePercent).toFixed(2) + '%',
          isPositive
        };
      });
      setMarketData(mapped);
    } catch (err) {
      console.warn("Market data fetch warning:", err);
      // Fallback to mock data if fetch fails
      setMarketData([
        { symbol: 'BTC', name: 'Bitcoin', price: 65000, change: '+1.2%', isPositive: true },
        { symbol: 'ETH', name: 'Ethereum', price: 3500, change: '-0.5%', isPositive: false },
        { symbol: 'SOL', name: 'Solana', price: 145, change: '+3.1%', isPositive: true },
      ]);
    } finally {
      setMarketLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      setNewsError('');
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss');
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setNews(data.items.slice(0, 4).map((item: any) => {
           const diffMs = Date.now() - new Date(item.pubDate).getTime();
           const hours = Math.floor(diffMs / 3600000);
           const time = hours > 0 ? `${hours}h ago` : 'Just now';
           return {
             headline: item.title,
             source: item.author || 'Cointelegraph',
             time,
             link: item.link
           };
        }));
        return;
      }
      throw new Error('No news items found');
    } catch (err) {
      console.warn("News fetch warning (using fallback):", err);
      setNews([
        { headline: 'Bitcoin Surges Past Key Resistance Level as Institutional Inflows Accelerate', source: 'Cointelegraph', time: '2h ago', link: 'https://cointelegraph.com' },
        { headline: 'Ethereum Layer 2 Total Value Locked Reaches New All-Time High', source: 'CoinDesk', time: '4h ago', link: 'https://coindesk.com' },
        { headline: 'Solana DeFi Volume Surpasses Major Competitors in Q3 Trading Surge', source: 'Decrypt', time: '6h ago', link: 'https://decrypt.co' },
        { headline: 'Global Regulatory Frameworks Shape Next Phase of Digital Asset Adoption', source: 'Blockworks', time: '8h ago', link: 'https://blockworks.co' },
      ]);
      setNewsError('');
    } finally {
      setNewsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMarketData();
    fetchNews();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const [showDepositModal, setShowDepositModal] = useState(false);

  useEffect(() => {
    if (safeStorage.getItem('aver_auto_open_deposit') === 'true') {
      safeStorage.removeItem('aver_auto_open_deposit');
      setShowDepositModal(true);
    }
  }, []);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showEventsPromosModal, setShowEventsPromosModal] = useState(false);
  const [showSupportCenterModal, setShowSupportCenterModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showExploreStrategiesModal, setShowExploreStrategiesModal] = useState(false);

  const [amount, setAmount] = useState('');
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  // Fallback defaults if user profile isn't fully loaded or is null
  const { totalNetBalance, activeTradingBalance, aiTradingCapital, homeNetBalance, walletData } = useFinancials();
  
  const { markAsRead: markSupportAsRead } = useSupportUnread(user?.uid, user?.email);

  useEffect(() => {
    if (activeTab === 'support' || showSupportCenterModal) {
      markSupportAsRead();
    }
  }, [activeTab, showSupportCenterModal, markSupportAsRead]);
  
  const resetTime = useMemo(() => {
    if (user?.resetPnL && user?.pnlResetAt) {
      const parsed = new Date(user.pnlResetAt).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [user?.resetPnL, user?.pnlResetAt]);

  // Active AI Session Profit/Loss (inside active session)
  const activeSessionPnL = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      const closedSessionPnL = (session.tradingCapital || 0) - (session.initialCapital || 0);
      return closedSessionPnL + totalFloatingPnl;
    }
    return 0;
  }, [session, totalFloatingPnl]);

  // Source completed sessions from context or local cache
  const activeCompletedSessions = useMemo(() => {
    if (completedSessions && completedSessions.length > 0) return completedSessions;
    const uId = user?.uid || 'guest_user';
    const local = safeStorage.getItem(`aver_latest_completed_session_${uId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed) return [parsed];
      } catch (e) {}
    }
    return [];
  }, [completedSessions, user?.uid]);

  const closedTradesPnL = useMemo(() => {
    // 1. Check actual closed trades in state after resetTime
    const filteredTrades = trades.filter((t: any) => {
      if (t.status !== 'CLOSED') return false;
      if (!resetTime) return true;
      const tTime = t.closedAt ? (t.closedAt.toDate ? t.closedAt.toDate().getTime() : new Date(t.closedAt).getTime()) : (t.timestamp ? new Date(t.timestamp).getTime() : 0);
      return tTime >= resetTime;
    });

    const fromTrades = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    if (fromTrades !== 0) return fromTrades;

    // 2. Check completed sessions ended after resetTime
    if (activeCompletedSessions && activeCompletedSessions.length > 0) {
      const filteredSessions = activeCompletedSessions.filter((s: any) => {
        if (!resetTime) return true;
        const sTime = s.endTime ? (typeof s.endTime === 'number' ? s.endTime : new Date(s.endTime).getTime()) : (s.startTime ? (typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime()) : 0);
        return sTime >= resetTime;
      });
      const fromSessions = filteredSessions.reduce((sum, s) => sum + (s.totalPnl || 0), 0);
      if (fromSessions !== 0) return fromSessions;
    }
    
    if (resetTime > 0) {
      return 0;
    }

    // 3. Fallbacks if no resetTime set
    if (user?.totalProfit !== undefined || user?.totalLoss !== undefined) {
      const diff = (user?.totalProfit || 0) - (user?.totalLoss || 0);
      if (diff !== 0) return diff;
    }

    // 4. Check portfolio todayPnL
    if (user?.portfolio?.todayPnL !== undefined && user.portfolio.todayPnL !== 0) {
      return user.portfolio.todayPnL;
    }
    
    return 0;
  }, [trades, activeCompletedSessions, user, resetTime]);

  // Home Net Balance represents the single authoritative consolidated balance (Net Balance = Total Net Portfolio Value)
  const totalValue = useMemo(() => {
    return totalNetBalance > 0 ? totalNetBalance : (homeNetBalance > 0 ? homeNetBalance : (user?.portfolioBalance || 0));
  }, [totalNetBalance, homeNetBalance, user?.portfolioBalance]);

  // Account baseline for trading return calculations (independent of cash deposits/withdrawals)
  const baselineAccountBalance = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      const allocated = session.initialCapital || session.tradingCapital || 1000;
      const unallocated = homeNetBalance;
      const starting = unallocated + allocated;
      return starting > 0 ? starting : (allocated > 0 ? allocated : 1000);
    }
    // When session is inactive, baseline = current balance minus PnL (ensures starting balance is mathematically sound)
    const pnl = closedTradesPnL !== 0 ? closedTradesPnL : (user?.portfolio?.todayPnL || 0);
    const computedBase = totalNetBalance - pnl;
    return computedBase > 0 ? computedBase : (totalNetBalance > 0 ? totalNetBalance : 1000);
  }, [session, homeNetBalance, totalNetBalance, closedTradesPnL, user?.portfolio?.todayPnL]);

  // Total PnL dollar change for performance indicator strictly driven by trading activity
  const totalPlAmount = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      // While active, trading PnL is the active session PnL + closed trades PnL
      return activeSessionPnL + closedTradesPnL;
    }
    if (closedTradesPnL !== 0 || totalFloatingPnl !== 0) {
      return closedTradesPnL + totalFloatingPnl;
    }
    if (user?.portfolio?.todayPnL !== undefined && user.portfolio.todayPnL !== 0) {
      return user.portfolio.todayPnL;
    }
    return 0;
  }, [session, activeSessionPnL, closedTradesPnL, totalFloatingPnl, user?.portfolio?.todayPnL]);

  // Performance indicator percentage beneath Net Balance
  const totalPlPercent = useMemo(() => {
    if (baselineAccountBalance <= 0) return 0;
    return (totalPlAmount / baselineAccountBalance) * 100;
  }, [totalPlAmount, baselineAccountBalance]);

  // Overall Return Amount & Overall Return % (strictly trading return, unaffected by deposits/withdrawals)
  const overallReturnAmount = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      return activeSessionPnL + closedTradesPnL;
    }
    if (user?.portfolio?.overallReturn !== undefined && user.portfolio.overallReturn !== 0) {
      return user.portfolio.overallReturn;
    }
    return totalPlAmount;
  }, [session?.status, activeSessionPnL, closedTradesPnL, user?.portfolio?.overallReturn, totalPlAmount]);

  const overallReturnPercent = useMemo(() => {
    if (session?.status === 'ACTIVE') {
      const sessionInitial = session.initialCapital || session.tradingCapital || 1000;
      if (sessionInitial > 0) {
        return (overallReturnAmount / sessionInitial) * 100;
      }
      return 0;
    }

    // When session is inactive / completed:
    const filteredSessions = activeCompletedSessions.filter((s: any) => {
      if (!resetTime) return true;
      const sTime = s.endTime ? (typeof s.endTime === 'number' ? s.endTime : new Date(s.endTime).getTime()) : (s.startTime ? (typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime()) : 0);
      return sTime >= resetTime;
    });

    if (filteredSessions.length > 0) {
      const latest = filteredSessions[0];
      if (typeof latest.pnlPercent === 'number' && latest.pnlPercent !== 0) {
        return latest.pnlPercent;
      }
      if (latest.initialCapital && latest.initialCapital > 0) {
        return ((latest.totalPnl || 0) / latest.initialCapital) * 100;
      }
    }

    if (resetTime > 0) {
      return 0;
    }

    if (user?.portfolio?.todayPnLPercent !== undefined && user.portfolio.todayPnLPercent !== 0) {
      return user.portfolio.todayPnLPercent;
    }

    const base = baselineAccountBalance > 0 ? baselineAccountBalance : (totalValue > 0 ? totalValue : 1000);
    if (base <= 0) return 0;
    return (overallReturnAmount / base) * 100;
  }, [session, overallReturnAmount, activeCompletedSessions, resetTime, user?.portfolio?.todayPnLPercent, baselineAccountBalance, totalValue]);

  const totalValueFormatted = formatCurrency(totalValue);
  const todayPnLFormatted = (totalPlAmount < 0 ? '-' : '+') + formatCurrency(Math.abs(totalPlAmount));
  const todayPnLPercentFormatted = (totalPlPercent >= 0 ? '+' : '') + totalPlPercent.toFixed(2) + '%';
  const overallReturnFormatted = (overallReturnPercent >= 0 ? '+' : '') + overallReturnPercent.toFixed(2) + '%';

  // Respect user notification preferences for the header unread badge count
  const unreadNotificationsCount = useMemo(() => {
    if (!notifications || notifications.length === 0) return 0;
    const notifPrefs = preferences?.notifications || (user?.notificationSettings as any) || {};
    const isMasterOn = notifPrefs.master ?? true;
    if (!isMasterOn) return 0;

    return notifications.filter(n => {
      if (n.read || n.archived) return false;
      const cat = n?.category || 'system';
      if (cat === 'security' && notifPrefs.security === false) return false;
      if (['account', 'profile'].includes(cat) && notifPrefs.profile === false) return false;
      if (cat === 'deposit' && notifPrefs.deposits === false) return false;
      if (cat === 'withdrawal' && notifPrefs.withdrawals === false) return false;
      if (['trading', 'portfolio', 'copy_trading', 'swap', 'ai'].includes(cat) && notifPrefs.trading === false) return false;
      if (['referral', 'vault', 'rewards'].includes(cat) && notifPrefs.rewards === false) return false;
      if (['system'].includes(cat) && notifPrefs.system === false) return false;
      if (['marketing'].includes(cat) && notifPrefs.marketing === false) return false;
      return true;
    }).length;
  }, [notifications, preferences?.notifications, user?.notificationSettings]);

  const referralCount = user?.referralCount || 0;
  const closedTradesCount = trades.filter((t: any) => t.status === 'CLOSED').length;
  const totalAiTradesCount = Math.max(user?.aiTradesCount || 0, closedTradesCount);
  
  const loginStreak = (() => {
    const rawStreak = user?.streak ?? user?.loginStreak;
    const currentStreak = typeof rawStreak === 'number' ? rawStreak : 0;
    
    // Check if 24 full hours of inactivity have elapsed since last activity
    const raw = user?.lastActivityAt || user?.lastLoginDate || user?.lastLogin;
    if (raw) {
      const lastTime = typeof raw?.toMillis === 'function'
        ? raw.toMillis()
        : (typeof raw?.toDate === 'function' ? raw.toDate().getTime() : new Date(raw).getTime());
      if (!isNaN(lastTime)) {
        const elapsed = Date.now() - lastTime;
        // Inactive for 24 full hours: streak resets to 0
        if (elapsed >= 24 * 60 * 60 * 1000) {
          return 0;
        }
      }
    }
    return currentStreak;
  })();
  const winRun = user?.winRun || 0;
  
  // Calculate XP and level based strictly on real activity
  const calculatedActivityXp = (totalAiTradesCount * 20) + (winRun * 15) + (loginStreak * 10) + (referralCount * 50) + (user?.emailVerified ? 20 : 0) + (user?.kycStatus === 'verified' ? 35 : 0);
  const totalXp = Math.max(user?.xp || 0, calculatedActivityXp);
  const currentLevel = Math.max(1, Math.floor(totalXp / 1000) + 1);
  const nextLevelXp = currentLevel * 1000;
  const xpProgressPercent = Math.min(100, Math.round(((totalXp % 1000) / 1000) * 100));

  const createdAtTime = (user?.createdAt && !isNaN(new Date(user.createdAt).getTime())) ? new Date(user.createdAt).getTime() : 0;
  const accountAgeDays = createdAtTime > 0 ? Math.floor((Date.now() - createdAtTime) / 86400000) : 0;

  const realDeposits = Number(user?.totalDeposits) || 0;

  const badges = [
    { name: 'Pioneer', unlocked: accountAgeDays >= 7 || totalAiTradesCount >= 20, icon: '🚀', desc: '7+ Days Member or 20 Trades' },
    { name: 'AI Pilot', unlocked: totalAiTradesCount >= 10, icon: '🤖', desc: 'Executed 10+ AI Trades' },
    { name: 'Alpha', unlocked: referralCount >= 2, icon: '👑', desc: 'Referred 2 Active Users' },
    { name: 'VIP Vault', unlocked: realDeposits >= 10000, icon: '💎', desc: 'Deposited $10,000+' }
  ];

  if (currentLevel >= 5) {
    const milestoneLevel = Math.floor(currentLevel / 5) * 5;
    badges.push({ name: `Level ${milestoneLevel} Vanguard`, unlocked: true, icon: '🎖️', desc: 'Level Milestone' });
  }
  
  // HELPER METHODS FOR ACCOUNT ACTIVITY AND SMART ASSISTANT
  const getRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60000) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diffMs / 86400000);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const activitiesList = useMemo(() => {
    if (!activity || activity.length === 0) return [];

    const list: any[] = [];
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();

    activity.forEach((act: any) => {
      if (!act || !act.message) return;
      if (act.id && seenIds.has(act.id)) return;

      const dateObj = act.timestamp ? (act.timestamp.toDate ? act.timestamp.toDate() : new Date(act.timestamp)) : new Date();
      if (isNaN(dateObj.getTime())) return;
      
      const timeMs = dateObj.getTime();
      const timeBucket = Math.floor(timeMs / 20000); // 20-second bucket
      const cleanMsg = (act.message || '').trim().toLowerCase();
      const typeKey = `${act.type || 'system'}|${cleanMsg}|${timeBucket}`;

      if (seenKeys.has(typeKey)) return;

      // Check if duplicate of an already mapped item within 30s
      const isDup = list.some(existing => {
        if (existing.id === act.id) return true;
        const existingMsg = (existing.description || '').trim().toLowerCase();
        const existingTime = existing.timestamp.getTime();
        const timeDiff = Math.abs(existingTime - timeMs);
        if (existingMsg === cleanMsg && existing.originalType === act.type && timeDiff < 30000) return true;
        if (existingMsg === cleanMsg && timeDiff < 10000) return true;
        return false;
      });

      if (isDup) return;

      if (act.id) seenIds.add(act.id);
      seenKeys.add(typeKey);

      let mappedType = act.type || 'system';
      let mappedTitle = 'Activity Logged';
      let mappedCategory = 'system';

      if (act.type === 'deposit' || act.type?.includes('DEPOSIT')) {
        mappedTitle = 'Deposit Confirmed';
        mappedType = 'deposit';
        mappedCategory = 'financial';
      } else if (act.type === 'withdrawal' || act.type?.includes('WITHDRAWAL')) {
        mappedTitle = 'Withdrawal Approved';
        mappedType = 'withdrawal';
        mappedCategory = 'financial';
      } else if (act.type === 'CONFIG_UPDATED') {
        mappedTitle = 'Configuration Saved';
        mappedType = 'config';
        mappedCategory = 'security';
      } else if (act.type === 'SESSION_STARTED') {
        mappedTitle = 'AI Engine Started';
        mappedType = 'session-start';
        mappedCategory = 'trading';
      } else if (act.type === 'SESSION_ENDED') {
        mappedTitle = 'AI Engine Paused';
        mappedType = 'session-end';
        mappedCategory = 'trading';
      } else if (act.type === 'TRADE_OPENED') {
        mappedTitle = 'Trade Executed';
        mappedType = 'trade-open';
        mappedCategory = 'trading';
      } else if (act.type === 'TRADE_CLOSED') {
        mappedTitle = 'Trade Closed';
        mappedType = 'trade-close';
        mappedCategory = 'trading';
      } else if (act.type === 'TP_HIT') {
        mappedTitle = 'Take Profit Executed';
        mappedType = 'tp-hit';
        mappedCategory = 'trading';
      } else if (act.type === 'SL_HIT') {
        mappedTitle = 'Stop Loss Triggered';
        mappedType = 'sl-hit';
        mappedCategory = 'trading';
      } else if (act.type === 'REBALANCE') {
        mappedTitle = 'Portfolio Rebalanced';
        mappedType = 'rebalance';
        mappedCategory = 'trading';
      } else if (act.type === 'COPY_TRADE') {
        mappedTitle = 'Copy Trade Executed';
        mappedType = 'copy-trade';
        mappedCategory = 'trading';
      }

      list.push({
        id: act.id,
        type: mappedType,
        originalType: act.type,
        title: mappedTitle,
        description: act.message,
        timestamp: dateObj,
        category: mappedCategory
      });
    });

    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return list;
  }, [activity]);

  const getAssistantWarnings = () => {
    const warnings: any[] = [];

    // Calculate XP / Tier (Platinum tier is reached at XP >= 100 or level >= 2 or verified status)
    const isEmailVerified = !!user?.emailVerified;
    const isTwoFactorEnabled = !!user?.twoFactorEnabled;
    const isDeposited = (user?.totalDeposits || 0) > 0 || (user?.portfolioBalance || 0) > 0;
    const isKycVerified = user?.kycStatus === 'verified';
    const isTraded = (user?.aiTradesCount || 0) > 0 || (user?.totalProfit || 0) !== 0;
    const referralCount = user?.referralCount || 0;

    let calcXp = user?.xp || 0;
    if (isEmailVerified) calcXp += 20;
    if (isTwoFactorEnabled) calcXp += 25;
    if (isDeposited) calcXp += 25;
    if (isKycVerified) calcXp += 35;
    if (isTraded) calcXp += 15;
    if (user?.phoneNumber) calcXp += 15;
    if (referralCount > 0) calcXp += Math.min(referralCount * 15, 60);

    const isPlatinumOrHigher = calcXp >= 100 || (user?.level || 1) >= 2 || isKycVerified;

    // 1. Identity verification (Shows whenever user is not verified)
    if (!user?.kycStatus || user.kycStatus !== 'verified') {
      warnings.push({
        id: 'kyc',
        title: 'Identity Verification Incomplete',
        description: 'Complete your tier-1 verification to unlock unlimited asset trades and premium withdrawals',
        actionText: 'Verify Identity',
        actionType: 'prop',
        actionName: 'bonus-center'
      });
    }

    // 4. Referral rewards claimable
    if (user?.referralCount && user.referralCount > 0) {
      warnings.push({
        id: 'referral',
        title: 'Referral Rewards Claimable',
        description: 'You have active referrals awaiting collection! Claim your XP and bonuses at the Centre.',
        actionText: 'Claim Rewards',
        actionType: 'prop',
        actionName: 'referral-centre'
      });
    }

    return warnings;
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setTxError('Please enter a valid positive deposit amount.');
      return;
    }
    setTxLoading(true);
    setTxError('');
    setTxSuccess('');
    try {
      await addDeposit(value);
      setTxSuccess(`Success! Deposited $${value.toLocaleString()} to your wallet.`);
      setAmount('');
      setTimeout(() => {
        setShowDepositModal(false);
        setTxSuccess('');
      }, 1500);
    } catch (err: any) {
      setTxError(err.message || 'Deposit failed. Please try again.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setTxError('Please enter a valid positive withdrawal amount.');
      return;
    }
    setTxLoading(true);
    setTxError('');
    setTxSuccess('');
    try {
      await addWithdrawal(value);
      setTxSuccess(`Success! Withdrew $${value.toLocaleString()} from your wallet.`);
      setAmount('');
      setTimeout(() => {
        setShowWithdrawModal(false);
        setTxSuccess('');
      }, 1500);
    } catch (err: any) {
      setTxError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    await clearNotifications();
  };

  const containerClasses = isDark 
    ? "bg-black text-white" 
    : "bg-slate-50 text-slate-900";

  const cardClasses = isDark
    ? "bg-slate-900/40 backdrop-blur-md border border-white/5 shadow-xl"
    : "bg-white/60 backdrop-blur-md border border-slate-200/50 shadow-lg";

  const modalBgClasses = isDark
    ? "bg-black border border-white/10 shadow-2xl"
    : "bg-white border border-slate-200 shadow-2xl";

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className={`min-h-screen flex flex-col ${containerClasses} transition-colors duration-500 overflow-x-hidden font-sans`}>
      
      {/* Animated subtle background gradients */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[100px] rounded-full" />
        </div>
      )}

      {/* Desktop Left Sidebar Navigation */}
      {!isFullScreen && (
        <aside className={`fixed inset-y-0 left-0 w-64 hidden lg:flex flex-col z-30 border-r ${isDark ? 'bg-slate-950/45 border-white/5 backdrop-blur-xl' : 'bg-white/75 border-slate-200/50 backdrop-blur-xl'} transition-colors duration-500`}>
        {/* Sidebar Header with branding */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <AverLogo theme={theme} size={28} showText={true} />
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { name: t('common.home') || 'Dashboard', id: 'home', icon: DashboardIcon },
            { name: 'Copy Trading', id: 'copy-trading', icon: Copy },
            { name: t('common.portfolio') || 'Wallet', id: 'portfolio', icon: WalletIcon },
            { name: t('common.market') || 'Trades', id: 'markets', icon: TradesIcon },
            { name: t('common.discover') || 'Analytics', id: 'discover', icon: AnalyticsIcon },
          ].map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigateTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                    : `${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} border border-transparent`
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile section at the bottom of sidebar */}
        <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-slate-200/50'} flex items-center justify-between`}>
          <button 
            onClick={() => navigateTab('profile')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <UserAvatar user={user} sizeClass="w-full h-full" isDark={isDark} />
            </div>
            <div className="truncate max-w-[120px]">
              <p className={`text-xs font-bold ${textPrimary} truncate`}>
                {user?.displayName || user?.fullName || user?.username || user?.email || 'User'}
              </p>
              <p className="text-[10px] text-emerald-500 font-medium">Pro Account</p>
            </div>
          </button>
          
          <button
            onClick={() => onNavigate('preferences')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${textSecondary}`}>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </aside>
      )}

      {/* Main content shifted left margin on desktop */}
      <div className={`${isFullScreen ? '' : 'lg:pl-64'} flex-1 flex flex-col`}>
        <div className={`relative z-10 flex-1 flex flex-col p-0 sm:p-0 ${isFullScreen ? 'w-full max-w-none m-0' : 'lg:max-w-none lg:mx-0'} pt-safe ${activeTab !== 'markets' && activeTab !== 'coin-details' && activeTab !== 'portfolio' && activeTab !== 'ai' && activeTab !== 'support' ? 'pt-[50px]' : ''} ${!isFullScreen && (activeTab === 'home' || activeTab === 'profile' || activeTab === 'discover') ? 'p-4 sm:p-6 lg:max-w-5xl lg:mx-auto' : ''}`}>
          
          {activeTab !== 'markets' && activeTab !== 'coin-details' && activeTab !== 'portfolio' && activeTab !== 'ai' && activeTab !== 'support' && (
            <header className={`fixed top-0 left-0 lg:left-64 right-0 h-[50px] flex justify-between items-center px-4 lg:px-8 z-40 ${isDark ? 'bg-black/80 backdrop-blur-md border-b border-white/5' : 'bg-slate-50/80 backdrop-blur-md border-b border-slate-200'}`}>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigateTab('profile')}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-[1.5px] hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer animate-in fade-in zoom-in duration-300"
              >
                <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
                  {authLoading ? (
                    <div className="w-full h-full animate-pulse bg-slate-700" />
                  ) : (
                    <UserAvatar user={user} sizeClass="w-full h-full" isDark={isDark} />
                  )}
                </div>
              </button>
              <div>
                {authLoading ? (
                  <div className="w-20 h-4 rounded animate-pulse bg-slate-700" />
                ) : (
                  <h1 className={`text-sm font-bold tracking-tight ${textPrimary}`}>
                    {user?.displayName || user?.fullName || user?.username || user?.email || 'User'}
                  </h1>
                )}
              </div>
            </div>

            {/* Center High-Frequency Unrealized P/L Counter */}
            <div id="header-unrealized-pl-wrapper" className="flex items-center justify-center">
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  markSupportAsRead();
                  navigateTab('support');
                }}
                title="Customer Support"
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer relative ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}
              >
                <MessageSquare className={`w-4 h-4 ${textPrimary}`} />
              </button>

              <button 
                onClick={() => setShowNotificationsModal(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer relative ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}
              >
                <Bell className={`w-4 h-4 ${textPrimary}`} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-slate-950">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>
          </header>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="w-full"
          >
            {activeTab === 'home' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
              
              {/* Section 1: Portfolio Card */}
              <motion.div variants={itemVariants} className={`rounded-[24px] p-6 relative overflow-hidden ${cardClasses}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
                
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-sm font-medium ${textSecondary}`}>Net Balance</p>
                  <button 
                    onClick={() => onNavigate('history')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative group active:scale-95 shadow-lg ${
                      isDark 
                        ? 'bg-slate-950/60 border border-white/10 hover:border-white/20' 
                        : 'bg-white/80 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <History className={`w-5 h-5 transition-transform group-hover:rotate-[-12deg] ${isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                  </button>
                </div>

                <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${textPrimary} mb-4`}>
                  {totalValueFormatted}
                </h2>
                
                <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-nowrap overflow-x-auto no-scrollbar">
                  <div 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: totalPlAmount >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderColor: totalPlAmount >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: totalPlAmount >= 0 ? '#22c55e' : '#ef4444'
                    }}
                  >
                    {totalPlAmount >= 0 ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                    <span className="text-xs sm:text-sm font-black whitespace-nowrap">{todayPnLFormatted}</span>
                    <span className="text-[11px] sm:text-xs font-bold opacity-90 whitespace-nowrap">({todayPnLPercentFormatted})</span>
                  </div>
                  <div className={`text-xs font-semibold whitespace-nowrap shrink-0 ${textSecondary}`}>
                    Overall: <span className="font-bold whitespace-nowrap" style={{ color: overallReturnPercent >= 0 ? '#22c55e' : '#ef4444' }}>{overallReturnFormatted}</span>
                  </div>
                </div>

                {session?.status === 'ACTIVE' && (
                  <div className="mb-6 -mt-3 flex items-start space-x-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug font-medium text-amber-500/90">
                      <strong>AI Session Active:</strong> ${session.initialCapital.toLocaleString()} has been temporarily allocated to active Trading Capital, reducing your available balance. Your total net asset value is fully preserved in your Portfolio.
                    </p>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <button 
                    onClick={handleOpenDeposit}
                    className="flex-1 max-w-[140px] flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1a1a1a] border border-white/10 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-105 hover:border-emerald-500/50 active:scale-95 shadow-lg cursor-pointer"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/512/3050/3050249.png" alt="Deposit" className="w-6 h-6 mb-2 invert" />
                    <span>Deposit</span>
                  </button>
                  <button 
                    onClick={handleOpenWithdraw}
                    className="flex-1 max-w-[140px] flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1a1a1a] border border-white/10 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-105 hover:border-emerald-500/50 active:scale-95 shadow-lg cursor-pointer"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/512/3050/3050250.png" alt="Withdraw" className="w-6 h-6 mb-2 invert" />
                    <span>Withdraw</span>
                  </button>
                </div>
              </motion.div>


              <div className="space-y-6">
                  {/* Smart Account Assistant Widget */}
                  {(() => {
                    const warnings = getAssistantWarnings();
                    if (warnings.length === 0) return null;
                    const warning = warnings[0]; // Display highest priority warning
                    return (
                      <motion.div 
                        variants={itemVariants}
                        className={`rounded-[24px] p-5 relative overflow-hidden border ${
                          isDark 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-1">
                            <h4 className={`text-sm font-black tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                              {warning.title}
                            </h4>
                            <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                              {warning.description}
                            </p>
                            <button 
                              onClick={() => {
                                if ((warning as any).onClick) (warning as any).onClick();
                                if (warning.actionType === 'tab') {
                                  navigateTab(warning.targetTab);
                                } else if (warning.actionType === 'prop') {
                                  onNavigate(warning.actionName);
                                }
                              }}
                              className={`mt-4 px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer ${
                                isDark 
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                            >
                              {warning.actionText}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Account Activity Timeline Widget */}
                  <motion.div variants={itemVariants}>
                    <div className="flex justify-between items-end mb-3">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${textSecondary} flex items-center gap-1.5`}>
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Account Timeline
                      </h3>
                      <button 
                        onClick={() => setShowClearTimelineModal(true)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'hover:bg-white/5 text-neutral-500 hover:text-rose-500' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'}`}
                        title="Clear Timeline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className={`rounded-[24px] p-5 space-y-4 ${cardClasses} max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2`}>
                      {activitiesList.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                          No recent account activities.
                        </div>
                      ) : (
                        <div className="relative border-l border-white/5 ml-3 pl-5 space-y-5">
                          {activitiesList.slice(0, 40).map((item, i) => {
                            let icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                            if (item.type === 'deposit') icon = <ArrowDownRight className="w-4 h-4 text-emerald-400" />;
                            if (item.type === 'withdrawal') icon = <ArrowUpRight className="w-4 h-4 text-rose-400" />;
                            if (item.category === 'trading') icon = <Brain className="w-4 h-4 text-blue-400" />;
                            if (item.category === 'referral') icon = <Award className="w-4 h-4 text-purple-400" />;
                            if (item.category === 'security') icon = <ShieldCheck className="w-4 h-4 text-amber-400" />;

                            return (
                              <div key={`act-${item.id || 'gen'}-${i}-${item.timestamp?.getTime?.() || i}`} className="relative">
                                <div className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full flex items-center justify-center border ${
                                  isDark ? 'bg-[#08090e] border-white/10' : 'bg-white border-slate-200'
                                }`}>
                                  {icon}
                                </div>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className={`text-xs font-bold tracking-tight ${textPrimary}`}>{item.title}</h5>
                                    <p className={`text-[11px] mt-0.5 leading-normal ${textSecondary}`}>{item.description}</p>
                                  </div>
                                  <span className="text-[9px] font-medium text-gray-500 whitespace-nowrap ml-2">
                                    {getRelativeTime(item.timestamp)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Achievement & Progress Widget */}
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="flex justify-between items-end mb-1">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${textSecondary} flex items-center gap-1.5`}>
                        <Award className="w-4 h-4 text-amber-500" />
                        Level & Milestones
                      </h3>
                    </div>

                    <div className={`rounded-[24px] p-5 ${cardClasses} space-y-4`}>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <div>
                            <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">Trading Rank</span>
                            <h4 className={`text-lg font-black tracking-tight ${textPrimary}`}>Level {currentLevel}</h4>
                          </div>
                          <span className={`text-xs font-bold ${textSecondary}`}>{totalXp} / {nextLevelXp} XP</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${xpProgressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1 animate-pulse" />
                          <p className={`text-[10px] font-bold ${textSecondary}`}>Streak</p>
                          <p className={`text-xs font-black ${textPrimary} mt-0.5`}>{loginStreak} {loginStreak === 1 ? 'Day' : 'Days'}</p>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                          <p className={`text-[10px] font-bold ${textSecondary}`}>Win Run</p>
                          <p className={`text-xs font-black ${textPrimary} mt-0.5`}>{winRun}</p>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <Brain className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <p className={`text-[10px] font-bold ${textSecondary}`}>AI Trades</p>
                          <p className={`text-xs font-black ${textPrimary} mt-0.5`}>{totalAiTradesCount}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Unlocked Insignias</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {badges.map((badge, i) => (
                            <div 
                              key={`badge-${badge.name}-${i}`} 
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border whitespace-nowrap ${
                                badge.unlocked 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-white/[0.01] border-white/5 text-gray-600 opacity-40'
                              }`}
                              title={badge.desc}
                            >
                              <span className="text-xs">{badge.icon}</span>
                              <span className="text-[10px] font-bold tracking-tight">{badge.name}</span>
                              {!badge.unlocked && <Lock className="w-2.5 h-2.5" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
              </div>

              </motion.div>
            )}

            {activeTab === 'copy-trading' && <CopyTrading theme={theme} />}

            {activeTab === 'portfolio' && (
              <PortfolioViewV2 
                theme={theme} 
                onBack={goBackTab} 
                onNavigate={navigateTab}
                onOpenDeposit={handleOpenDeposit} 
                onOpenWithdraw={handleOpenWithdraw}
                onViewModeChange={setPortfolioViewMode}
              />
            )}

            {activeTab === 'markets' && <MarketsPage theme={theme} onSelectAsset={(asset) => { setSelectedAsset(asset); navigateTab('coin-details', { asset }); }} />}
            {activeTab === 'coin-details' && (
              <CoinDetailsPage 
                asset={selectedAsset || currentLocation.asset || { symbol: 'BTC', name: 'Bitcoin', price: '$94,200', change: '+2.4%' }} 
                theme={theme} 
                onBack={goBackTab}
                onTrade={(symbol) => navigateTab('ai', { asset: symbol })}
              />
            )}
            {activeTab === 'discover' && <DiscoverView theme={theme} onOpenMarketHighlights={() => onNavigate('market-highlights')} onOpenEventsPromos={() => navigateTab('events')} onOpenSupportCenter={() => navigateTab('support')} onOpenStrategies={() => setShowExploreStrategiesModal(true)} />}
            {activeTab === 'ai' && <AiTradingModule theme={theme} onOpenDeposit={handleOpenDeposit} />}
            {activeTab === 'profile' && <ProfileView theme={theme} onOpenBonusCenter={() => onNavigate('bonus-center')} onOpenReferralCentre={() => onNavigate('referral-centre')} onOpenPreferences={() => onNavigate('preferences')} onOpenSupportCenter={() => navigateTab('support')} />}
            
            {activeTab === 'events' && <EventsPromosPage theme={theme} onBack={goBackTab} onNavigateToTrading={() => navigateTab('ai')} />}
            {activeTab === 'support' && <SupportCenterPage theme={theme} onBack={goBackTab} />}
            
            {activeTab !== 'home' && activeTab !== 'copy-trading' && activeTab !== 'portfolio' && activeTab !== 'markets' && activeTab !== 'coin-details' && activeTab !== 'discover' && activeTab !== 'ai' && activeTab !== 'profile' && activeTab !== 'events' && activeTab !== 'support' && (
              <div className="py-10 text-center">
                <h1 className={`text-2xl font-bold ${textPrimary} mb-4 capitalize`}>{activeTab}</h1>
                <div className={`rounded-2xl p-10 flex flex-col items-center justify-center ${cardClasses}`}>
                  <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    {activeTab === 'markets' && <Activity className={`w-8 h-8 ${textSecondary}`} />}
                    {activeTab === 'ai' && <Brain className={`w-8 h-8 ${textSecondary}`} />}
                  </div>
                  <p className={`${textSecondary} font-medium`}>
                    {activeTab} module is coming soon.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
      
      {/* Persistent Bottom Navigation - Conditional Rendering */}
      {!isFullScreen && activeTab !== 'coin-details' && activeTab !== 'events' && activeTab !== 'events-promos' && activeTab !== 'support' && !(activeTab === 'portfolio' && (portfolioViewMode === 'vault' || portfolioViewMode === 'asset-stats')) && (
        <>
          <div className="h-20 flex-shrink-0 lg:hidden" aria-hidden="true" />
          <BottomNavigation activeTab={activeTab} onTabChange={navigateTab} />
        </>
      )}

      {/* --- SLEEK FLOATING MODALS (SATISFIES ALL REQUIREMENTS FOR PERSISTENCE TESTABILITY) --- */}

      {/* 1. INSTITUTIONAL FULL-SCREEN DEPOSIT EXPERIENCE */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(showDepositModal || currentLocation.modal === 'deposit' || currentLocation.view === 'deposit') && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`fixed inset-0 z-[100] ${isDark ? 'bg-black' : 'bg-slate-50'} overflow-hidden flex flex-col`}
            >
              <InstitutionalDepositPage 
                theme={theme}
                onBack={handleCloseDeposit}
                onClose={handleCloseDeposit}
                onSuccessDeposit={async (amountValue, method) => {
                  handleCloseDeposit();
                }}
                onOpenSupport={async (ticketData) => {
                  await saveSupportTicket(ticketData);
                  handleCloseDeposit();
                  navigateTab('support');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 2. DEDICATED FULL-SCREEN WITHDRAWAL EXPERIENCE */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(showWithdrawModal || currentLocation.modal === 'withdraw' || currentLocation.view === 'withdraw' || currentLocation.view === 'withdrawal') && (
            <InstitutionalWithdrawalPage 
              onClose={handleCloseWithdraw}
              onOpenHistory={() => {
                setShowWithdrawModal(false);
                if (onNavigate) {
                  onNavigate('history');
                }
                navigate({ view: 'history', modal: null });
              }}
              theme={theme}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 3. TRANSACTION HISTORY MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showHistoryModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }}
                className={`w-full max-w-lg rounded-[28px] p-6 max-h-[80vh] flex flex-col ${modalBgClasses}`}
              >
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h3 className={`text-lg font-black tracking-tight ${textPrimary} flex items-center`}>
                    <History className="w-5 h-5 mr-2 text-emerald-500" />
                    Transaction History
                  </h3>
                  <button 
                    onClick={() => setShowHistoryModal(false)}
                    className={`p-1.5 rounded-full hover:bg-white/5 ${textSecondary} cursor-pointer`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {(!user?.history || user.history.length === 0) ? (
                    <div className="text-center py-12 text-gray-500 font-medium">
                      No transactions recorded.
                    </div>
                  ) : (
                    user.history.map((hist, i) => (
                      <div 
                        key={`hist-${hist.id || 'h'}-${i}-${hist.date || i}`} 
                        className={`p-4 rounded-xl flex items-center justify-between border ${
                          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            hist.type === 'deposit' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {hist.type === 'deposit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${textPrimary} capitalize`}>{hist.type}</p>
                            <p className={`text-[10px] ${textSecondary}`}>{hist.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-sm ${
                            hist.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {hist.type === 'deposit' ? '+' : '-'}{formatCurrency(hist.amount)}
                          </p>
                          <p className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider inline-block mt-1">
                            {hist.status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 4. NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotificationsModal && (
          <NotificationCenter onClose={() => setShowNotificationsModal(false)} isDark={isDark} />
        )}
      </AnimatePresence>

      <ExploreStrategiesModal
        isOpen={showExploreStrategiesModal}
        onClose={() => setShowExploreStrategiesModal(false)}
        theme={theme}
        onSelectStrategy={handleSelectStrategy}
      />

      {/* Clear Timeline Confirmation Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showClearTimelineModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowClearTimelineModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative w-full max-w-sm rounded-[32px] overflow-hidden border p-8 ${
                  isDark ? 'bg-[#0a0b10] border-white/10' : 'bg-white border-slate-200'
                } shadow-2xl z-10`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                    <Trash2 className="w-8 h-8 text-rose-500" />
                  </div>
                  
                  <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                    Clear Timeline?
                  </h3>
                  <p className={`text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-slate-500'} mb-8 leading-relaxed px-2`}>
                    Completing this action will clear your current timeline history. Are you sure you want to continue?
                  </p>
                  
                  <div className="flex flex-col w-full gap-3">
                    <button
                      onClick={() => {
                        setShowClearTimelineModal(false);
                        clearActivityHistory();
                      }}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowClearTimelineModal(false)}
                      className={`w-full py-4 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                        isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
