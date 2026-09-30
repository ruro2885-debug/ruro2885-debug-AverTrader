import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { 
  ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownRight, 
  ExternalLink, Clock, Wallet, History,
  ArrowRightLeft, AlertCircle, CheckCircle2, XCircle, ChevronRight, X,
  Sparkles, Layers, Shield, Calendar, DollarSign, Trash2, FileText,
  Copy, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { transactionService, getExplorerUrl } from '../services/transactionService';
import { TransactionRecord } from '../types';
import { safeStorage } from '../utils/storage';
import { useAppNavigation } from '../contexts/NavigationContext';
import CoinLogo from './CoinLogo';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLocalWithdrawals, getStatusPriority, isActionedStatus, getActionForWithdrawal, recordWithdrawalAction } from '../lib/withdrawalStore';

type TabType = 'transactions' | 'orders' | 'order-history';

interface FilterState {
  type: string;
  asset: string;
  network: string;
  time: string;
}

const TYPE_OPTIONS = [
  'All', 
  'Deposit', 
  'Withdrawal', 
  'Transfer', 
  'AI Allocation', 
  'Profit Settlement', 
  'Loss Settlement', 
  'Reward', 
  'Interest',
  'Adjustment'
];

const ASSET_OPTIONS = ['All', 'USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'USD'];
const NETWORK_OPTIONS = ['All', 'TRC20', 'ERC20', 'BEP20', 'Solana', 'Internal'];
const TIME_OPTIONS = ['All Time', 'Today', 'Past 7 Days', 'Past 30 Days', 'Past 90 Days'];

interface TransactionHistoryProps {
  onBack: () => void;
  onOpenSupport?: () => void;
}

const ReversalReasonTab = ({ 
  reason, 
  isDark, 
  onPress 
}: { 
  reason: string; 
  isDark: boolean; 
  onPress: () => void; 
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      const el = textRef.current;
      // Check if scrollWidth > clientWidth to detect horizontal overflow
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, [reason]);

  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full p-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 hover:border-purple-500/30 text-[11px] space-y-1 text-left transition-all cursor-pointer flex flex-col gap-1 focus:outline-none focus:ring-1 focus:ring-purple-500/40`}
    >
      <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Reversal Reason</span>
      </div>
      
      <div className="flex items-center justify-between w-full gap-2">
        <p
          ref={textRef}
          className={`font-medium ${
            isDark ? 'text-neutral-200' : 'text-slate-700'
          } truncate flex-1 block whitespace-nowrap overflow-hidden`}
        >
          {reason}
        </p>
        {isOverflowing && (
          <span className="text-purple-400 font-bold shrink-0 text-[10px] whitespace-nowrap">
            see more...
          </span>
        )}
      </div>
    </button>
  );
};

export default function TransactionHistory({ onBack, onOpenSupport }: TransactionHistoryProps) {
  const { user } = useAuth();
  const { formatCurrency, theme } = usePreferences();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    asset: 'All',
    network: 'All',
    time: 'All Time'
  });

  const [activeFilterModal, setActiveFilterModal] = useState<'type' | 'asset' | 'network' | 'time' | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionRecord | null>(null);
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedReceipt) {
      const net = (selectedReceipt.network || '').toLowerCase();
      const typ = (selectedReceipt.type || '').toLowerCase();
      const tit = (selectedReceipt.title || '').toLowerCase();
      const id = (selectedReceipt.id || '').toLowerCase();
      if (
        net.includes('trading engine') || 
        net.includes('trade engine') || 
        id.startsWith('trd-') || 
        typ === 'order_creation' ||
        tit.includes('trading engine') ||
        tit.includes('trade engine')
      ) {
        setSelectedReceipt(null);
      }
    }
  }, [selectedReceipt]);

  const { registerOverlay } = useAppNavigation();

  useEffect(() => {
    if (selectedReceipt) {
      return registerOverlay('tx-receipt-modal', () => {
        setSelectedReceipt(null);
      });
    }
  }, [selectedReceipt, registerOverlay]);

  useEffect(() => {
    if (activeFilterModal) {
      return registerOverlay('tx-filter-modal', () => {
        setActiveFilterModal(null);
      });
    }
  }, [activeFilterModal, registerOverlay]);

  useEffect(() => {
    if (showReasonPopup) {
      return registerOverlay('tx-reason-popup', () => {
        setShowReasonPopup(false);
      });
    }
  }, [showReasonPopup, registerOverlay]);

  // Custom Explorer Lookup Modal
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [explorerInputHash, setExplorerInputHash] = useState('');
  const [explorerInputNetwork, setExplorerInputNetwork] = useState('TRC20');

  useEffect(() => {
    if (showExplorerModal) {
      return registerOverlay('tx-explorer-modal', () => {
        setShowExplorerModal(false);
      });
    }
  }, [showExplorerModal, registerOverlay]);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label}`);
  };

  const handleContactSupport = () => {
    setShowReasonPopup(false);
    setSelectedReceipt(null);
    if (onOpenSupport) {
      onOpenSupport();
    } else {
      onBack();
    }
  };

  const handleDelete = async (txId: string) => {
    if (!user) return;
    try {
      await transactionService.deleteTransaction(txId, user.uid);
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (e) {
      console.warn("Failed to delete transaction:", e);
    }
  };

  // Real-time synchronization
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      const data = await transactionService.getUserTransactions(user.uid, user);
      setTransactions(data);
    } catch (err) {
      console.warn("Error fetching transactions:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Global outside click / single item focus reset listener
  useEffect(() => {
    if (!swipedItemId) return;
    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      const swipedEl = document.getElementById(`tx-item-${swipedItemId}`);
      if (swipedEl && !swipedEl.contains(e.target as Node)) {
        setSwipedItemId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideInteraction, { capture: true });
    document.addEventListener('touchstart', handleOutsideInteraction, { capture: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction, { capture: true });
      document.removeEventListener('touchstart', handleOutsideInteraction, { capture: true });
    };
  }, [swipedItemId]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    // Only set loading on initial fetch if empty to prevent screen flicker on updates
    if (transactions.length === 0) {
      setLoading(true);
    }
    const unsub = transactionService.subscribeUserTransactions(user.uid, (data) => {
      setTransactions(data);
      setSelectedReceipt(prev => {
        if (!prev) return null;
        const updated = data.find(t => 
          t.id === prev.id || 
          t.refId === prev.id || 
          (prev.refId && (t.refId === prev.refId || t.id === prev.refId)) ||
          (prev.txHash && (t.txHash === prev.txHash || t.id === prev.txHash))
        );
        if (!updated) return prev;
        const curPri = getStatusPriority(prev.status);
        const incPri = getStatusPriority(updated.status);
        // An actioned withdrawal (Completed, Failed, Reversed) can NEVER revert to Pending!
        const effectiveStatus = (curPri >= 2 && incPri < 2) ? prev.status : (incPri >= curPri ? updated.status : prev.status);
        return {
          ...prev,
          ...updated,
          status: effectiveStatus,
          reversalReason: updated.reversalReason || prev.reversalReason
        };
      });
      setLoading(false);
      setIsRefreshing(false);
    }, user);

    return () => unsub();
  }, [user?.uid]);

  // Dedicated real-time sync for the currently selected receipt
  useEffect(() => {
    if (!selectedReceipt || !selectedReceipt.id) return;
    const receiptId = selectedReceipt.id;
    const refId = selectedReceipt.refId;
    const txHash = selectedReceipt.txHash;

    const updateFromSnapshot = (data: any) => {
      if (!data) return;
      const rawStatus = (data.status || '').toLowerCase();
      let normalizedStatus: TransactionRecord['status'] = 'Pending';
      if (rawStatus === 'completed' || rawStatus === 'approved' || rawStatus === 'successful' || rawStatus === 'success') {
        normalizedStatus = 'Completed';
      } else if (rawStatus === 'reversed') {
        normalizedStatus = 'Reversed';
      } else if (rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'cancelled') {
        normalizedStatus = 'Failed';
      } else if (rawStatus === 'processing') {
        normalizedStatus = 'Processing';
      }

      setSelectedReceipt(prev => {
        if (!prev) return null;
        const isTarget = prev.id === receiptId || (refId && prev.refId === refId) || (txHash && prev.txHash === txHash);
        if (!isTarget) return prev;

        const actionRecord = getActionForWithdrawal(prev.id, prev.refId, prev.txHash);
        const targetStatus = actionRecord ? actionRecord.status : normalizedStatus;
        const targetIsActioned = isActionedStatus(targetStatus);
        const curIsActioned = isActionedStatus(prev.status);

        let effectiveStatus = prev.status;
        if (targetIsActioned) {
          effectiveStatus = targetStatus;
        } else if (curIsActioned && !targetIsActioned) {
          effectiveStatus = prev.status;
        } else {
          effectiveStatus = targetStatus;
        }

        return {
          ...prev,
          status: effectiveStatus,
          reversalReason: (actionRecord?.reversalReason) || data.reversalReason || data.reason || prev.reversalReason,
          destination: data.destination || data.destinationAddress || prev.destination,
          network: data.network || prev.network,
          txHash: data.txHash || prev.txHash,
          amount: data.amount !== undefined ? (Number(data.amount) < 0 ? data.amount : -Math.abs(Number(data.amount))) : prev.amount
        };
      });

      // Synchronize in the transactions list
      setTransactions(prev => prev.map(t => {
        if (t.id === receiptId || (refId && t.refId === refId) || (txHash && t.txHash === txHash)) {
          const tActionRecord = getActionForWithdrawal(t.id, t.refId, t.txHash);
          const tTargetStatus = tActionRecord ? tActionRecord.status : normalizedStatus;
          const tTargetIsActioned = isActionedStatus(tTargetStatus);
          const tCurIsActioned = isActionedStatus(t.status);

          let tEffectiveStatus = t.status;
          if (tTargetIsActioned) {
            tEffectiveStatus = tTargetStatus;
          } else if (tCurIsActioned && !tTargetIsActioned) {
            tEffectiveStatus = t.status;
          } else {
            tEffectiveStatus = tTargetStatus;
          }

          return {
            ...t,
            status: tEffectiveStatus,
            reversalReason: (tActionRecord?.reversalReason) || data.reversalReason || data.reason || t.reversalReason
          };
        }
        return t;
      }));
    };

    // 1. Check local withdrawals store first
    try {
      const local = getLocalWithdrawals();
      const localMatch = local.find(w => w && (w.id === receiptId || (refId && w.refId === refId) || (txHash && w.txHash === txHash)));
      if (localMatch && localMatch.status) {
        updateFromSnapshot(localMatch);
      }
    } catch (e) {}

    // 2. Direct Firestore document listeners
    const unsubAdmin = onSnapshot(doc(db, 'admin_withdrawals', receiptId), (snap) => {
      if (snap.exists()) updateFromSnapshot(snap.data());
    }, () => {});

    const unsubWth = onSnapshot(doc(db, 'withdrawals', receiptId), (snap) => {
      if (snap.exists()) updateFromSnapshot(snap.data());
    }, () => {});

    const unsubTx = onSnapshot(doc(db, 'transactions', receiptId), (snap) => {
      if (snap.exists()) updateFromSnapshot(snap.data());
    }, () => {});

    // Global shared action registry listeners to heal local state and ensure absolute status consistency
    const unsubRegistry = onSnapshot(doc(db, 'withdrawal_actions_registry', receiptId), (snap) => {
      if (snap.exists()) {
        const actionData = snap.data();
        recordWithdrawalAction([receiptId, refId, txHash], actionData as any);
        updateFromSnapshot({ status: actionData.rawStatus || actionData.status, reversalReason: actionData.reversalReason });
      }
    }, () => {});

    // Also check alternate doc keys (refId or txHash) if different
    let unsubRef: (() => void) | undefined;
    if (refId && refId !== receiptId) {
      unsubRef = onSnapshot(doc(db, 'admin_withdrawals', refId), (snap) => {
        if (snap.exists()) updateFromSnapshot(snap.data());
      }, () => {});
    }

    let unsubRegistryRef: (() => void) | undefined;
    if (refId && refId !== receiptId) {
      unsubRegistryRef = onSnapshot(doc(db, 'withdrawal_actions_registry', refId), (snap) => {
        if (snap.exists()) {
          const actionData = snap.data();
          recordWithdrawalAction([receiptId, refId, txHash], actionData as any);
          updateFromSnapshot({ status: actionData.rawStatus || actionData.status, reversalReason: actionData.reversalReason });
        }
      }, () => {});
    }

    return () => {
      unsubAdmin();
      unsubWth();
      unsubTx();
      unsubRegistry();
      if (unsubRef) unsubRef();
      if (unsubRegistryRef) unsubRegistryRef();
    };
  }, [selectedReceipt?.id, selectedReceipt?.refId, selectedReceipt?.txHash]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
  };

  // Filter items based on active tab & selected filters
  const filteredItems = useMemo(() => {
    return transactions.filter(item => {
      // Completely exclude any fake or trade engine transaction/receipt
      const net = (item.network || '').toLowerCase();
      const typ = (item.type || '').toLowerCase();
      const tit = (item.title || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      if (
        net.includes('trading engine') || 
        net.includes('trade engine') || 
        id.startsWith('trd-') || 
        typ === 'order_creation' || 
        (typ === 'trade' && (net.includes('engine') || tit.includes('trade') || tit.includes('crypto'))) ||
        tit.includes('trading engine') ||
        tit.includes('trade engine')
      ) {
        return false;
      }

      // 1. Tab match
      if (activeTab === 'transactions') {
        if (item.category === 'orders' && item.status === 'Pending') return false;
      } else if (activeTab === 'orders') {
        if (item.status !== 'Pending') return false;
      } else if (activeTab === 'order-history') {
        if (item.status === 'Pending' || (item.category !== 'order-history' && item.type !== 'trade' && !item.type.includes('order'))) {
          return false;
        }
      }

      // 2. Type filter
      if (filters.type !== 'All') {
        const t = (item.type || '').toLowerCase();
        const f = filters.type.toLowerCase();
        if (f === 'deposit' && !t.includes('deposit')) return false;
        if (f === 'withdrawal' && !t.includes('withdrawal')) return false;
        if (f === 'transfer' && !t.includes('transfer')) return false;
        if (f === 'trade' && !t.includes('trade') && !t.includes('order')) return false;
        if (f === 'ai allocation' && !t.includes('allocation') && !t.includes('session')) return false;
        if (f === 'profit settlement' && !t.includes('profit')) return false;
        if (f === 'loss settlement' && !t.includes('loss')) return false;
        if (f === 'reward' && !t.includes('reward') && !t.includes('bonus') && !t.includes('cashback')) return false;
        if (f === 'interest' && !t.includes('interest')) return false;
        if (f === 'adjustment' && !t.includes('adjustment')) return false;
      }

      // 3. Asset filter
      if (filters.asset !== 'All') {
        if ((item.asset || '').toUpperCase() !== filters.asset.toUpperCase()) return false;
      }

      // 4. Network filter
      if (filters.network !== 'All') {
        const net = (item.network || '').toLowerCase();
        const fn = filters.network.toLowerCase();
        if (fn === 'internal') {
          if (!net.includes('internal') && net !== '') return false;
        } else {
          if (!net.includes(fn)) return false;
        }
      }

      // 5. Time filter
      if (filters.time !== 'All Time') {
        const itemDate = new Date(item.timestamp).getTime();
        const now = Date.now();
        if (filters.time === 'Today') {
          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          if (itemDate < startOfDay.getTime()) return false;
        } else if (filters.time === 'Past 7 Days') {
          if (now - itemDate > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (filters.time === 'Past 30 Days') {
          if (now - itemDate > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (filters.time === 'Past 90 Days') {
          if (now - itemDate > 90 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, filters]);

  // Group filtered items by Date string
  const groupedItems = useMemo(() => {
    const groups: Record<string, TransactionRecord[]> = {};
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    filteredItems.forEach(item => {
      const d = new Date(item.timestamp);
      const dateKeyStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let displayLabel = dateKeyStr;
      if (dateKeyStr === todayStr) displayLabel = 'Today';
      else if (dateKeyStr === yesterdayStr) displayLabel = 'Yesterday';

      if (!groups[displayLabel]) groups[displayLabel] = [];
      groups[displayLabel].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Windowing & Virtual Infinite Scroll threshold for 60fps scrolling performance
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 350) {
      setDisplayLimit(prev => Math.min(prev + 25, 2000));
    }
  }, []);

  useEffect(() => {
    setDisplayLimit(30);
  }, [activeTab, filters]);

  const windowedGroupedItems = useMemo(() => {
    let count = 0;
    const result: Record<string, TransactionRecord[]> = {};
    for (const [label, items] of Object.entries(groupedItems) as [string, TransactionRecord[]][]) {
      if (count >= displayLimit) break;
      const needed = displayLimit - count;
      const sliced = items.slice(0, needed);
      result[label] = sliced;
      count += sliced.length;
    }
    return result;
  }, [groupedItems, displayLimit]);

  const renderItemIcon = useCallback((item: TransactionRecord) => {
    const symbol = (item.asset || 'USDT').toUpperCase();
    return <CoinLogo symbol={symbol} size={36} className="shadow-sm" />;
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'approved' || s === 'successful' || s === 'filled') {
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (s === 'reversed') {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    if (s === 'pending' || s === 'verifying' || s === 'processing') {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    if (s === 'failed' || s === 'rejected' || s === 'declined' || s === 'expired' || s === 'cancelled') {
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'approved' || s === 'successful' || s === 'filled') {
      return 'Successful';
    }
    if (s === 'reversed') {
      return 'Reversed';
    }
    if (s === 'failed' || s === 'rejected' || s === 'declined' || s === 'expired' || s === 'cancelled') {
      return 'Failed';
    }
    if (s === 'pending' || s === 'verifying') {
      return 'Pending';
    }
    if (s === 'processing') {
      return 'Processing';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, []);

  const openExplorer = (txHash: string, network: string, customUrl?: string) => {
    const url = customUrl || getExplorerUrl(txHash, network);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCustomExplorerSearch = () => {
    if (!explorerInputHash.trim()) return;
    const url = getExplorerUrl(explorerInputHash.trim(), explorerInputNetwork);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setShowExplorerModal(false);
      setExplorerInputHash('');
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${isDark ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Compact Header */}
      <header className={`px-5 sm:px-8 pt-4 pb-3 flex items-center justify-between sticky top-0 z-20 ${
        isDark ? 'bg-neutral-950/90 border-b border-white/10' : 'bg-white/90 border-b border-slate-200'
      } backdrop-blur-xl`}>
        <div className="flex items-center space-x-3.5">
          <button 
            type="button"
            onClick={onBack}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
            }`}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">Transaction History</h1>
            <p className="text-[11px] text-neutral-400 hidden sm:block">Live ledger of all platform activities and trade executions</p>
          </div>
        </div>
      </header>

      {/* Spaced Tabs with Animated Indicator */}
      <div className={`px-5 sm:px-8 pt-2 pb-0.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex space-x-6 sm:space-x-10 max-w-7xl mx-auto">
          {(['transactions', 'orders', 'order-history'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const tabLabel = tab === 'transactions' ? 'Transactions' : tab === 'orders' ? 'Open Orders' : 'Order History';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                  isActive 
                    ? (isDark ? 'text-white' : 'text-slate-900') 
                    : (isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                {/* Tab Content */}
                <span className="relative z-10">{tabLabel}</span>
                
                {/* Indicator (Always present to avoid layout shifting) */}
                <motion.div 
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-transparent'}`}
                  layoutId="activeTabIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Unstacked Filter Bar */}
      <div className="px-5 sm:px-8 py-2.5 border-b border-white/5 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {/* Filter 1: Type */}
          <button
            type="button"
            onClick={() => setActiveFilterModal('type')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filters.type !== 'All'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : (isDark ? 'bg-neutral-900/80 border-white/10 text-neutral-300 hover:border-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm')
            }`}
          >
            <span className="text-neutral-400 font-normal">Type:</span>
            <span className="font-bold">{filters.type}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 ml-0.5" />
          </button>

          {/* Filter 2: Asset */}
          <button
            type="button"
            onClick={() => setActiveFilterModal('asset')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filters.asset !== 'All'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : (isDark ? 'bg-neutral-900/80 border-white/10 text-neutral-300 hover:border-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm')
            }`}
          >
            <span className="text-neutral-400 font-normal">Asset:</span>
            <span className="font-bold">{filters.asset}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 ml-0.5" />
          </button>

          {/* Filter 3: Network */}
          <button
            type="button"
            onClick={() => setActiveFilterModal('network')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filters.network !== 'All'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : (isDark ? 'bg-neutral-900/80 border-white/10 text-neutral-300 hover:border-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm')
            }`}
          >
            <span className="text-neutral-400 font-normal">Network:</span>
            <span className="font-bold">{filters.network}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 ml-0.5" />
          </button>

          {/* Filter 4: Time */}
          <button
            type="button"
            onClick={() => setActiveFilterModal('time')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filters.time !== 'All Time'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : (isDark ? 'bg-neutral-900/80 border-white/10 text-neutral-300 hover:border-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm')
            }`}
          >
            <span className="text-neutral-400 font-normal">Time:</span>
            <span className="font-bold">{filters.time}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 rotate-90 ml-0.5" />
          </button>

          {/* Clear Filters reset chip */}
          {(filters.type !== 'All' || filters.asset !== 'All' || filters.network !== 'All' || filters.time !== 'All Time') && (
            <button
              type="button"
              onClick={() => setFilters({ type: 'All', asset: 'All', network: 'All', time: 'All Time' })}
              className="h-9 px-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area with Virtualized Smooth Scroll */}
      <div 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 max-w-7xl mx-auto w-full flex flex-col justify-between"
        style={{ contain: 'content', transform: 'translateZ(0)' }}
      >
        <div>
          {loading ? (
            // Skeleton Loader
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl animate-pulse flex items-center justify-between border ${
                    isDark ? 'bg-neutral-900/50 border-white/5' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-800" />
                    <div className="space-y-2">
                      <div className="w-32 h-4 rounded-lg bg-neutral-800" />
                      <div className="w-20 h-3 rounded-lg bg-neutral-800" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="w-24 h-4 rounded-lg bg-neutral-800 ml-auto" />
                    <div className="w-16 h-3 rounded-lg bg-neutral-800 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedItems).length === 0 ? (
            // Empty State (Genuinely no matching records)
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center space-y-4"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                isDark ? 'bg-neutral-900 border-white/10 text-neutral-400' : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <History className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold tracking-tight">No Transactions Found</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {transactions.length === 0 
                    ? 'Your transaction history will appear here once you complete your first operation.'
                    : 'No transaction records match your currently active filters. Try resetting your filter selection.'
                  }
                </p>
              </div>
              {(filters.type !== 'All' || filters.asset !== 'All' || filters.network !== 'All' || filters.time !== 'All Time') && (
                <button
                  type="button"
                  onClick={() => setFilters({ type: 'All', asset: 'All', network: 'All', time: 'All Time' })}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Reset All Filters
                </button>
              )}
            </motion.div>
          ) : (
            // Render Transaction List Grouped By Date (Windowed for 60fps scrolling)
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + JSON.stringify(filters)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6"
              >
                {(Object.entries(windowedGroupedItems) as [string, TransactionRecord[]][]).map(([dateLabel, items], gIdx) => (
                  <div key={`group-${dateLabel}-${gIdx}`} className="space-y-2.5">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-500">{dateLabel}</h3>
                      <div className="flex-1 h-[1px] bg-white/5" />
                    </div>

                    <div className="space-y-1.5 min-h-[72px]">
                      {items.map((item, idx) => (
                        <TransactionItem 
                          key={`tx-${item.id || 'record'}-${dateLabel}-${idx}`}
                          item={item}
                          idx={idx}
                          isDark={isDark}
                          swipedItemId={swipedItemId}
                          setSwipedItemId={setSwipedItemId}
                          setSelectedReceipt={setSelectedReceipt}
                          setConfirmDeleteId={setConfirmDeleteId}
                          renderItemIcon={renderItemIcon}
                          getStatusBadge={getStatusBadge}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Explorer Button embedded at the end of the scrollable list (not fixed/sticky) */}
        <div className="mt-8 pt-4 pb-6">
          <button 
            type="button"
            onClick={() => setShowExplorerModal(true)}
            className={`w-full py-3.5 px-5 rounded-2xl border-2 border-dashed flex items-center justify-center space-x-3 group transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer ${
              isDark 
                ? 'border-white/15 hover:border-emerald-500/40 text-neutral-300 hover:text-emerald-400 bg-neutral-900/40' 
                : 'border-slate-300 hover:border-emerald-500/40 text-slate-600 hover:text-emerald-600 bg-slate-50'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isDark ? 'bg-white/5 group-hover:bg-emerald-500/10' : 'bg-slate-200 group-hover:bg-emerald-50'}`}>
              <Search className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-bold">Can't find your transaction? Check explorer</span>
          </button>
        </div>
      </div>

      {/* Filter Options Selection Modal */}
      <AnimatePresence>
        {activeFilterModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className={`w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 space-y-6 border shadow-2xl ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold capitalize">Select {activeFilterModal}</h3>
                <button
                  type="button"
                  onClick={() => setActiveFilterModal(null)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {(activeFilterModal === 'type' ? TYPE_OPTIONS :
                  activeFilterModal === 'asset' ? ASSET_OPTIONS :
                  activeFilterModal === 'network' ? NETWORK_OPTIONS : TIME_OPTIONS
                ).map(opt => {
                  const isSelected = filters[activeFilterModal] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, [activeFilterModal]: opt }));
                        setActiveFilterModal(null);
                      }}
                      className={`w-full p-4 rounded-2xl text-left font-bold text-sm transition flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400' 
                          : (isDark ? 'bg-neutral-950/60 hover:bg-neutral-950 border border-white/5 text-neutral-300' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700')
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-xs rounded-[28px] p-6 text-center shadow-2xl border ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Receipt?</h3>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                This transaction record will be permanently removed from your history. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await handleDelete(confirmDeleteId);
                    setConfirmDeleteId(null);
                    setSwipedItemId(null);
                    if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-600/20"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setSwipedItemId(null);
                  }}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Blockchain Explorer Lookup Modal */}
      <AnimatePresence>
        {showExplorerModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-[32px] p-6 sm:p-8 space-y-6 border shadow-2xl ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Check Blockchain Explorer</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExplorerModal(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Transaction Hash (TxID)</label>
                  <input
                    type="text"
                    value={explorerInputHash}
                    onChange={(e) => setExplorerInputHash(e.target.value)}
                    placeholder="e.g., 0x7f8c... or 4f2a..."
                    className="w-full font-mono text-sm bg-neutral-950 border border-white/10 rounded-2xl p-4 outline-none focus:border-emerald-500 transition text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Blockchain Network</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['TRC20', 'ERC20', 'Solana', 'BEP20', 'Bitcoin'].map(net => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setExplorerInputNetwork(net)}
                        className={`p-3 rounded-xl text-xs font-bold border transition ${
                          explorerInputNetwork === net 
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                            : 'bg-neutral-950 border-white/5 text-neutral-400 hover:border-white/10'
                        }`}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCustomExplorerSearch}
                  disabled={!explorerInputHash.trim()}
                  className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center space-x-2 transition ${
                    explorerInputHash.trim()
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <span>Open Blockchain Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Full Receipt Modal Overhaul */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={`w-full max-w-sm rounded-[24px] border overflow-hidden shadow-2xl ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {(() => {
                const isWithdrawal = selectedReceipt.type.toLowerCase().includes('withdrawal');
                const isReversed = (selectedReceipt.status || '').toLowerCase() === 'reversed';
                const tokenPrice = selectedReceipt.asset === 'BTC' ? 64000 : selectedReceipt.asset === 'ETH' ? 3400 : selectedReceipt.asset === 'SOL' ? 145 : 1;
                const rawCryptoAmount = selectedReceipt.cryptoAmount ? Math.abs(Number(selectedReceipt.cryptoAmount)) : null;
                const tokenAmountDisplay = rawCryptoAmount !== null 
                  ? rawCryptoAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })
                  : (Math.abs(Number(selectedReceipt.amount)) / tokenPrice).toFixed(6);
                const tokenSymbol = selectedReceipt.cryptoSymbol || selectedReceipt.asset || 'USDT';

                return (
                  <>
                    {/* Receipt Header */}
                    <div className="p-6 text-center border-b border-white/5 relative">
                      <button
                        onClick={() => setSelectedReceipt(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="flex justify-center mb-3">
                        <CoinLogo symbol={selectedReceipt.asset} size={56} className="shadow-lg border-4 border-white/5" />
                      </div>
                      
                      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">
                        {selectedReceipt.asset} {isWithdrawal ? 'Withdrawal' : selectedReceipt.type.includes('deposit') ? 'Deposit' : ''}
                      </h3>
                      
                      {isWithdrawal ? (
                        <>
                          <h2 className="text-3xl font-black tracking-tight mb-1 text-rose-500 font-mono whitespace-nowrap flex items-baseline justify-center gap-1.5">
                            -{tokenAmountDisplay} <span className="text-xl font-bold">{tokenSymbol}</span>
                          </h2>
                          <p className="text-xs text-neutral-400 font-medium mb-3">
                            ≈ ${Math.abs(Number(selectedReceipt.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className="text-3xl font-black tracking-tight mb-1 font-mono">
                            {selectedReceipt.type.includes('deposit') || selectedReceipt.type.includes('profit') ? '+$' : selectedReceipt.type.includes('loss') ? '-$' : '$'}
                            {Math.abs(Number(selectedReceipt.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h2>
                          {(selectedReceipt.cryptoAmount || (selectedReceipt.asset !== 'USD' && selectedReceipt.asset !== 'USDT' && selectedReceipt.asset !== 'USDC')) && (
                            <p className="text-xs text-neutral-400 font-medium mb-3 whitespace-nowrap flex items-baseline justify-center gap-1">
                              ~{selectedReceipt.cryptoAmount ? Math.abs(Number(selectedReceipt.cryptoAmount)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : (Math.abs(Number(selectedReceipt.amount)) / tokenPrice).toFixed(4)} <span className="font-semibold">{selectedReceipt.asset}</span>
                            </p>
                          )}
                        </>
                      )}
                      
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(selectedReceipt.status)}`}>
                          {getStatusLabel(selectedReceipt.status)}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Information Card */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-500 font-medium">Status</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            getStatusLabel(selectedReceipt.status) === 'Successful' ? 'text-emerald-500' :
                            getStatusLabel(selectedReceipt.status) === 'Reversed' ? 'text-purple-400' :
                            getStatusLabel(selectedReceipt.status) === 'Failed' || getStatusLabel(selectedReceipt.status) === 'Transaction Failed' ? 'text-rose-500' : 'text-amber-500'
                          }`}>
                            {getStatusLabel(selectedReceipt.status)}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Reversal Reason on Reversed Receipts */}
                      {isReversed && (
                        <ReversalReasonTab 
                          reason={selectedReceipt.reversalReason || 'Administrative correction and compliance review.'}
                          isDark={isDark}
                          onPress={() => setShowReasonPopup(true)}
                        />
                      )}

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-500 font-medium">Type</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{(selectedReceipt?.type || 'Transaction').replace(/_/g, ' ').toUpperCase()}</span>
                      </div>

                      {selectedReceipt.destination && selectedReceipt.destination !== 'N/A' && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-500 font-medium">Destination</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono text-[10px] ${isDark ? 'text-white/80' : 'text-slate-700'} truncate max-w-[130px]`}>
                              {selectedReceipt.destination}
                            </span>
                            <button onClick={() => handleCopy(selectedReceipt.destination!, 'Destination')} className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-500 font-medium">Network</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedReceipt.network || 'Mainnet'}</span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-500 font-medium">Date & Time</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{new Date(selectedReceipt.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>

                      {selectedReceipt.txHash && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-500 font-medium">Transaction Hash</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'} truncate max-w-[120px]`}>{selectedReceipt.txHash}</span>
                            <button onClick={() => handleCopy(selectedReceipt.txHash!, 'Hash')} className="p-1 hover:bg-emerald-500/10 rounded transition-colors text-emerald-500">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-500 font-medium">Reference ID</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[10px] ${isDark ? 'text-white/60' : 'text-slate-500'} truncate max-w-[120px]`}>{selectedReceipt.id}</span>
                          <button onClick={() => handleCopy(selectedReceipt.id, 'Reference ID')} className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {selectedReceipt.txHash && selectedReceipt.network !== 'Internal' && (
                        <div className="pt-2">
                          <button
                            onClick={() => openExplorer(selectedReceipt.txHash!, selectedReceipt.network!, selectedReceipt.explorerUrl)}
                            className={`w-full py-2.5 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-2 transition-all ${
                              isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            <span>View on Blockchain Explorer</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-5 pt-0">
                      <button
                        onClick={() => setSelectedReceipt(null)}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reversal Reason Popup Modal */}
      <AnimatePresence>
        {showReasonPopup && selectedReceipt && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm rounded-[24px] border p-6 shadow-2xl space-y-5 text-center ${
                isDark ? 'bg-neutral-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black tracking-tight">Withdrawal Reversal</h3>
                <p className="text-xs text-neutral-400">
                  This transaction was reversed and the funds have been returned to your account.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left space-y-1.5 ${
                isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Reason</span>
                <p className="text-xs leading-relaxed font-medium text-neutral-200">
                  {selectedReceipt.reversalReason || 'Administrative correction and compliance review.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReasonPopup(false)}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Understood
                </button>

                <div>
                  <button
                    type="button"
                    onClick={handleContactSupport}
                    className="text-xs text-neutral-400 hover:text-emerald-400 underline font-medium cursor-pointer transition-colors"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast for Copy Actions */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-xl shadow-emerald-500/30 flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// High-performance Transaction Item with Native-Quality Bounce-Snap Swipe
const TransactionItem = memo(({ 
  item, 
  idx, 
  isDark, 
  swipedItemId, 
  setSwipedItemId, 
  setSelectedReceipt, 
  setConfirmDeleteId,
  renderItemIcon,
  getStatusBadge,
  getStatusLabel
}: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isHorizontalRef = useRef<boolean | null>(null);

  const isDeposit = item.type.toLowerCase().includes('deposit');
  const isWithdrawal = item.type.toLowerCase().includes('withdrawal');
  const isProfit = item.type.toLowerCase().includes('profit') || item.type.toLowerCase().includes('reward');

  // Explicit setShowDeleteModal function mapped directly to confirmDeleteId state
  const setShowDeleteModal = (show: boolean) => {
    if (show) {
      setConfirmDeleteId(item.id);
    } else {
      setConfirmDeleteId(null);
    }
  };

  // Sync transitions from parent swipedItemId updates (e.g., outside click, other item swipe, or canceled modal)
  useEffect(() => {
    if (cardRef.current) {
      if (swipedItemId === item.id) {
        cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.2, 1.1)';
        cardRef.current.style.transform = 'translate3d(-80px, 0, 0) translateZ(0)';
        currentXRef.current = -80;
        if (bgRef.current) {
          bgRef.current.style.opacity = '1';
          bgRef.current.style.pointerEvents = 'auto';
        }
      } else {
        cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.2, 1.1)';
        cardRef.current.style.transform = 'translate3d(0px, 0, 0) translateZ(0)';
        currentXRef.current = 0;
        if (bgRef.current) {
          bgRef.current.style.opacity = '0';
          bgRef.current.style.pointerEvents = 'none';
        }
      }
    }
  }, [swipedItemId, item.id]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Single Item Focus: If another item is swiped, automatically close it immediately on new touch start
    if (swipedItemId && swipedItemId !== item.id) {
      setSwipedItemId(null);
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    startXRef.current = clientX;
    startYRef.current = clientY;
    
    // Base coordinate depending on active swipe position
    const baseTranslate = swipedItemId === item.id ? -80 : 0;
    currentXRef.current = baseTranslate;
    
    isDraggingRef.current = true;
    isHorizontalRef.current = null; // reset gesture direction lock
    
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current || !cardRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;
    
    // Lock direction to avoid horizontal swipe stealing native vertical page scroll
    if (isHorizontalRef.current === null) {
      const deltaX = Math.abs(diffX);
      const deltaY = Math.abs(diffY);

      if (deltaX > 4 || deltaY > 4) {
        if (deltaY > deltaX) {
          isHorizontalRef.current = false;
          isDraggingRef.current = false;
          return;
        } else {
          isHorizontalRef.current = true;
        }
      } else {
        return;
      }
    }
    
    if (isHorizontalRef.current === false) return;
    
    // Prevent native scrolling during active horizontal drag
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    
    const baseTranslate = swipedItemId === item.id ? -80 : 0;
    let newX = baseTranslate + diffX;
    
    // Limits and elastic resistance
    if (newX > 10) {
      newX = 10;
    }
    if (newX < -120) {
      newX = -120;
    }
    
    currentXRef.current = newX;
    cardRef.current.style.transform = `translate3d(${newX}px, 0, 0) translateZ(0)`;

    // Toggle background delete container opacity only when horizontal swipe distance exceeds -10px
    if (bgRef.current) {
      if (newX < -10) {
        bgRef.current.style.opacity = '1';
        bgRef.current.style.pointerEvents = 'auto';
      } else {
        bgRef.current.style.opacity = '0';
        bgRef.current.style.pointerEvents = 'none';
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || !cardRef.current) return;
    isDraggingRef.current = false;
    
    const finalX = currentXRef.current;
    
    // Smooth bouncing snap curves
    cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.2, 1.1)';
    
    // Bouncing Snap / Release threshold at exactly -40px
    if (finalX <= -40) {
      cardRef.current.style.transform = 'translate3d(-80px, 0, 0) translateZ(0)';
      currentXRef.current = -80;
      if (bgRef.current) {
        bgRef.current.style.opacity = '1';
        bgRef.current.style.pointerEvents = 'auto';
      }
      setSwipedItemId(item.id);
    } else {
      cardRef.current.style.transform = 'translate3d(0px, 0, 0) translateZ(0)';
      currentXRef.current = 0;
      if (bgRef.current) {
        bgRef.current.style.opacity = '0';
        bgRef.current.style.pointerEvents = 'none';
      }
      setSwipedItemId(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Skip clicking if a drag of more than 5px took place
    const baseTranslate = swipedItemId === item.id ? -80 : 0;
    if (Math.abs(currentXRef.current - baseTranslate) > 5) {
      return;
    }
    
    if (swipedItemId) {
      // Tap anywhere on the swiped item or other items to reset
      setSwipedItemId(null);
    } else {
      // Show full receipt details on tap
      const action = getActionForWithdrawal(item.id, item.refId, item.txHash);
      if (action) {
        setSelectedReceipt({
          ...item,
          status: action.status,
          reversalReason: action.reversalReason || item.reversalReason
        });
      } else {
        setSelectedReceipt(item);
      }
    }
  };

  return (
    <div 
      id={`tx-item-${item.id}`}
      className="relative overflow-hidden rounded-xl select-none group h-[72px] touch-pan-y"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Background Action Reveal Layer - opacity 0 and pointer-events none by default */}
      <div 
        ref={bgRef}
        style={{
          opacity: swipedItemId === item.id ? 1 : 0,
          pointerEvents: swipedItemId === item.id ? 'auto' : 'none',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: 'opacity 0.15s ease-out',
        }}
        className="absolute inset-0 bg-rose-600 flex items-center justify-end px-5 rounded-xl z-0"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(true);
          }}
          className="flex items-center gap-1.5 text-white font-extrabold text-xs bg-rose-700 hover:bg-rose-800 px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-900/20 z-20"
        >
          <span>Delete</span>
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Swipeable Card Content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onClick={handleClick}
        style={{ 
          transform: 'translate3d(0,0,0) translateZ(0)', 
          WebkitTransform: 'translate3d(0,0,0) translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
          borderRadius: '12px', 
          touchAction: 'pan-y' 
        }}
        className={`relative z-10 h-full p-3 flex items-center justify-between border cursor-pointer transition-shadow touch-pan-y ${
          isDark 
            ? 'bg-neutral-900 border-white/5 hover:border-white/10' 
            : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {renderItemIcon(item)}

          <div className="min-w-0">
            <h4 className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
              {`${item.asset || ''} ${item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)).replace(/_/g, ' ') : 'Transaction'}`}
            </h4>

            <div className="flex items-center space-x-1.5 text-[10px] font-medium text-neutral-500 mt-0.5">
              <span className="uppercase text-neutral-400 font-bold">{item.network || 'Network'}</span>
              <span className="opacity-30">•</span>
              <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-3">
          <p className={`text-[13px] font-black ${
            isDeposit || isProfit || (item.amount > 0 && !isWithdrawal) ? 'text-emerald-500' : 
            isWithdrawal || (item.amount < 0) ? 'text-rose-500' : 
            (isDark ? 'text-white' : 'text-slate-900')
          }`}>
            {isDeposit || isProfit ? '+$' : isWithdrawal ? '-$' : '$'}
            {Math.abs(Number(item.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${getStatusBadge(item.status)}`}>
            {getStatusLabel ? getStatusLabel(item.status) : item.status}
          </span>
        </div>
      </div>
    </div>
  );
});
