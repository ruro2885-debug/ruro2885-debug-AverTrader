import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { copyToClipboard } from '../lib/clipboard';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ReferralCenter({ theme, onBack }: { theme: 'light' | 'dark', onBack: () => void }) {
  const { user, updateProfile, addNotification } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [liveReferredUsers, setLiveReferredUsers] = useState<any[]>([]);

  const referralCode = user?.referralCode || (user?.uid ? `AVR-${user.uid.slice(0, 6).toUpperCase()}` : '');
  const referralLink = (user as any)?.referralLink || `https://aver.app/ref/${referralCode}`;

  useEffect(() => {
    if (!user) return;
    const codesToMatch = Array.from(new Set([
      user.referralCode,
      user.uid,
      referralCode,
      user.referralCode?.toLowerCase(),
      user.referralCode?.toUpperCase(),
      `AVR-${user.uid.slice(0, 6).toUpperCase()}`
    ].filter(Boolean)));

    const fetchReferred = async () => {
      try {
        setIsInitialLoading(true);
        const foundMap = new Map<string, any>();
        
        // Add existing from profile if present
        const profileList = Array.isArray((user as any)?.referredUsers) ? (user as any).referredUsers : [];
        profileList.forEach((u: any) => {
          if (u.uid || u.email || u.name) {
            foundMap.set(u.uid || u.email || u.name, u);
          }
        });

        // Query Firestore for users with matching referredBy
        for (const code of codesToMatch) {
          try {
            const q = query(collection(db, 'users'), where('referredBy', '==', code));
            const snap = await getDocs(q);
            snap.docs.forEach(docSnap => {
              const d = docSnap.data();
              if (d.uid !== user.uid) {
                const isPlat = d.membershipTier === 'platinum' || d.membershipTier === 'premium' || d.platinumReached === true;
                foundMap.set(d.uid || docSnap.id, {
                  uid: d.uid || docSnap.id,
                  name: d.username || d.displayName || d.email?.split('@')[0] || 'Referred Member',
                  email: d.email,
                  joinedAt: d.createdAt || new Date().toISOString(),
                  photoURL: d.profilePhotoURL || d.avatarUrl,
                  membershipTier: d.membershipTier || (isPlat ? 'platinum' : 'bronze'),
                  platinumReached: isPlat,
                  rewardedToMain: d.rewardedToMain || false
                });
              }
            });
          } catch (e) {}
        }

        setLiveReferredUsers(Array.from(foundMap.values()));
      } catch (err) {
        console.warn("Failed fetching live referred users:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchReferred();
  }, [user, referralCode]);

  const profileReferredList = Array.isArray((user as any)?.referredUsers) ? (user as any).referredUsers : [];
  const rawList = liveReferredUsers.length > 0 ? liveReferredUsers : profileReferredList;

  const referredUsersList = rawList.map((refUser: any) => {
    const isPremiumOrPlatinum = refUser.membershipTier === 'platinum' || refUser.membershipTier === 'premium' || refUser.platinumReached === true;
    return {
      ...refUser,
      platinumReached: isPremiumOrPlatinum,
      rewardedToMain: refUser.rewardedToMain || false
    };
  });

  const totalReferrals = Math.max(referredUsersList.length, (user as any)?.totalReferrals ?? user?.referralCount ?? 0);
  const totalReferralEarnings = totalReferrals * 10;
  const premiumUsersCount = referredUsersList.filter((u: any) => u.platinumReached).length;
  const referralLevel = (user as any)?.referralLevel || Math.floor(totalReferrals / 5) + 1;
  const [showLockModal, setShowLockModal] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Automatically credit $10 to main balance when a referee reaches Premium/Platinum
  useEffect(() => {
    if (!user || referredUsersList.length === 0) return;
    const uncreditedPremium = referredUsersList.filter((u: any) => u.platinumReached && !u.rewardedToMain);
    if (uncreditedPremium.length > 0 && updateProfile) {
      const bonus = uncreditedPremium.length * 10;
      const updatedList = referredUsersList.map((u: any) => u.platinumReached ? { ...u, rewardedToMain: true } : u);
      const currentAvail = Number(user.availableBalance) || 0;
      const currentPort = Number(user.portfolioBalance) || 0;
      updateProfile({
        availableBalance: currentAvail + bonus,
        portfolioBalance: currentPort + bonus,
        referredUsers: updatedList
      }).catch(() => {});
      if (addNotification) {
        addNotification(
          'rewards',
          'high',
          'Premium Referral Reward Added to Main Balance!',
          `+$${bonus}.00 USDT credited directly to your main balance for Premium referee(s)!`
        ).catch(() => {});
      }
    }
  }, [user?.uid, referredUsersList.length]);

  const formatJoinedDate = (dateVal: any) => {
    if (!dateVal) return 'Aug, 2026';
    let d: Date;
    if (typeof dateVal === 'object' && dateVal !== null) {
      if (typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if ('seconds' in dateVal) {
        d = new Date(dateVal.seconds * 1000);
      } else {
        d = new Date(dateVal);
      }
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) {
      return 'Aug, 2026';
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(referralCode);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-black text-white flex flex-col relative overflow-y-auto overflow-x-hidden"
    >
      {/* Fixed Back Button */}
      <button 
        onClick={onBack}
        className="fixed top-6 left-6 z-50 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 cursor-pointer shadow-xl transition-all"
        title="Back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* 1. Hero Section - Full Width Gradient */}
      <section className="relative w-full bg-gradient-to-br from-[#00e676] to-[#00bcd4] pt-16 pb-20 px-6 rounded-b-[48px] shadow-2xl shadow-emerald-500/10 z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center">
            {/* Floating Animation */}
            <motion.div 
              animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-8xl mb-8 drop-shadow-2xl filter brightness-110"
            >
              🎁
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight mb-6 leading-[1.1]">
              Unlock the Power of Aver:<br />Earn Together
            </h1>
            
            <p className="text-black/80 font-bold text-lg max-w-lg mb-10 leading-relaxed">
              Share Aver with your friends and earn generous rewards for every successful sign-up.
            </p>

            <button 
              onClick={handleCopyLink}
              className="bg-black text-[#00e676] px-10 py-5 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/40 flex items-center gap-3 cursor-pointer group"
            >
              <Copy className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {copiedLink ? 'Copied Link!' : 'Copy Your Unique Referral Link'}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Stats Dashboard - Glassmorphism */}
      <section className="px-6 -mt-10 relative z-30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[32px] shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-2 p-4 relative">
              {totalReferrals > 0 && (
                <button
                  onClick={() => setShowLockModal(true)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer shadow-lg"
                  title="Earnings Vault Status"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Total Earnings</span>
              <span className="text-3xl font-black text-white">
                {isInitialLoading ? '...' : `$${totalReferralEarnings.toFixed(2)}`}
              </span>
              <div className="flex items-center gap-1.5 text-[#00e676] text-[10px] font-black uppercase">
                <Zap className="w-3 h-3 fill-[#00e676]" /> Active Program
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-2 p-4 border-y md:border-y-0 md:border-x border-white/5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Referral Level</span>
              <span className="text-3xl font-black text-white">Level {referralLevel}</span>
              {/* Progress Bar */}
              <div className="w-32 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalReferrals % 5) * 20)}%` }}
                  className="h-full bg-[#00e676] rounded-full"
                />
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Total Referrals</span>
              <span className="text-3xl font-black text-white">{totalReferrals}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Friends</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Your Referral Code Display */}
      <section className="px-6 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[24px] space-y-4 text-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em]">Personal Invitation Code</h3>
            <div 
              onClick={handleCopyCode}
              className={`flex items-center justify-between bg-black/50 border border-dashed px-6 py-4 rounded-2xl group cursor-pointer transition-all ${copiedCode ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#00e676]/30 hover:bg-[#00e676]/5'}`}
            >
              <span className="text-2xl font-bold font-sans text-white tracking-wider">
                {copiedCode ? 'Copied' : referralCode}
              </span>
              <div className={`p-2 rounded-xl transition-all ${copiedCode ? 'bg-emerald-500 text-black' : 'bg-white/5 group-hover:bg-[#00e676] group-hover:text-black'}`}>
                {copiedCode ? <span className="text-xs font-black font-mono">✓</span> : <Copy className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Referred Users List */}
      <section className="flex-1 px-6 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] text-center mb-6">
            Your Network
          </h3>
          
          {referredUsersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-6">
              <motion.div 
                animate={{ 
                  y: [0, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-8xl drop-shadow-[0_0_30px_rgba(0,230,118,0.1)]"
              >
                🤖
              </motion.div>
              
              <div className="space-y-2 text-center">
                <h4 className="text-xl font-black text-white">Your network is waiting!</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed px-8">
                  Invite your first friend to start earning rewards from the Aver Referral Program.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {referredUsersList.slice(0, showAllReferrals ? undefined : 3).map((refUser: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00e676]/20 to-[#00bcd4]/20 border border-[#00e676]/30 flex items-center justify-center overflow-hidden">
                    {refUser.photoURL || refUser.avatar ? (
                      <img src={refUser.photoURL || refUser.avatar} alt={refUser.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#00e676] font-bold text-lg">
                        {(refUser.name || refUser.displayName || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm flex items-center justify-between">
                      <span>{refUser.name || refUser.displayName || 'Anonymous User'}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${refUser.platinumReached ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                        {refUser.platinumReached ? '🥈 Premium (+$10 Credited)' : '🥉 Standard'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Joined {formatJoinedDate(refUser.joinedAt)}
                    </div>
                  </div>
                </div>
              ))}
              
              {!showAllReferrals && referredUsersList.length > 3 && (
                <button
                  onClick={() => setShowAllReferrals(true)}
                  className="w-full py-4 mt-2 rounded-xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Show More ({referredUsersList.length - 3})
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Vault Status Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-white/10 p-8 rounded-[32px] max-w-md w-full space-y-6 shadow-2xl relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Referral Rewards Locked</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your accumulated rewards of <span className="text-[#00e676] font-bold">${totalReferralEarnings.toFixed(2)}</span> are currently locked. 
                <br /><br />
                To unlock these rewards and have them awarded to your balance, your referees are required to reach at least the <span className="text-white font-bold underline decoration-[#00e676]">Platinum Tier</span> through consistent trading activity.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">Active Referrals</span>
                <span className="text-white">{totalReferrals} Friends</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400">Reward Per Referral</span>
                <span className="text-[#00e676]">$10.00 USDT</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-2 border-t border-white/5">
                <span className="text-gray-400">Vault Status</span>
                <span className="text-amber-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Secured & Vested</span>
              </div>
            </div>
            <button
              onClick={() => setShowLockModal(false)}
              className="w-full py-4 rounded-2xl bg-[#00e676] text-black font-black hover:bg-[#00c853] transition-all cursor-pointer"
            >
              Got It
            </button>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
