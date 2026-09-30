import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  RotateCw, 
  ShieldAlert, 
  Sparkles, 
  Trophy, 
  Flame, 
  Users, 
  Coins, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Clock, 
  Gift,
  Award,
  Zap,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Filter,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { EventItem, EventCategory, EventStatus } from '../types/events';
import { getEffectiveParticipantCount } from '../utils/eventEnrollmentSimulator';
import { subscribeToEvents, joinEventService, claimEventRewardService } from '../services/eventsService';
import { useAuth } from '../contexts/AuthContext';
import EventDetailsPage from './events/EventDetailsPage';

interface EventsPromosPageProps {
  onBack?: () => void;
  onNavigateToTrading?: () => void;
  theme?: 'light' | 'dark';
}

const CATEGORIES: { id: EventCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Promotions' },
  { id: 'Trading Competition', label: 'Trading Competitions' },
  { id: 'Airdrop Sprint', label: 'Airdrop Sprints' },
  { id: 'Staking & Yield', label: 'Staking & Yield' },
  { id: 'VIP Quest', label: 'VIP Quests' },
  { id: 'New Listing', label: 'New Listings' }
];

function formatTimeLeft(targetTimeStr?: string): { days: number; hours: number; mins: number; secs: number } {
  if (!targetTimeStr) return { days: 0, hours: 0, mins: 0, secs: 0 };
  const target = new Date(targetTimeStr).getTime();
  const diff = Math.max(0, target - Date.now());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

export default function EventsPromosPage({
  onBack,
  onNavigateToTrading,
  theme = 'dark'
}: EventsPromosPageProps) {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<EventCategory | 'ALL'>('ALL');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);

  // Hero Carousel Index
  const [heroIndex, setHeroIndex] = useState<number>(0);

  // Real-time ticking timer trigger
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to Firestore events stream
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed fetching events:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Featured Events for Hero Stage
  const featuredEvents = useMemo(() => {
    const feats = events.filter(e => e.featured || e.status === 'LIVE' || e.status === 'ENDING_SOON');
    return feats.length > 0 ? feats.slice(0, 5) : events.slice(0, 3);
  }, [events]);

  // Auto rotate hero carousel
  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % featuredEvents.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [featuredEvents]);

  // Filtered dataset
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesCategory = activeCategory === 'ALL' || ev.category === activeCategory;
      const matchesSearch = !searchQuery || 
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [events, activeCategory, searchQuery]);

  // Categorized Section Subsets
  const livePromotions = useMemo(() => {
    return filteredEvents.filter(e => e.status === 'LIVE' && !e.featured).slice(0, 6);
  }, [filteredEvents]);

  const endingSoonEvents = useMemo(() => {
    return filteredEvents.filter(e => {
      if (e.status === 'ENDING_SOON') return true;
      if (!e.endTime) return false;
      const hoursLeft = (new Date(e.endTime).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 24 && e.status !== 'COMPLETED';
    });
  }, [filteredEvents, tick]);

  const upcomingEvents = useMemo(() => {
    return filteredEvents.filter(e => e.status === 'UPCOMING');
  }, [filteredEvents]);

  const completedEvents = useMemo(() => {
    return filteredEvents.filter(e => e.status === 'COMPLETED');
  }, [filteredEvents]);

  // If user selected an event, render the dedicated full-screen details view
  if (selectedEventId) {
    return (
      <EventDetailsPage 
        eventId={selectedEventId}
        onBack={() => setSelectedEventId(null)}
        onNavigateToTrading={onNavigateToTrading}
        theme={theme}
      />
    );
  }

  // Calculate platform totals
  const totalPoolUSD = events.reduce((acc, ev) => acc + (ev.totalRewardPool || 0), 0);
  const totalTraders = events.reduce((acc, ev) => acc + getEffectiveParticipantCount(ev).count, 0);

  const activeHero = featuredEvents[heroIndex] || events[0];
  const activeHeroSim = activeHero ? getEffectiveParticipantCount(activeHero) : { formattedCount: '0' };
  const heroTimeLeft = formatTimeLeft(activeHero?.endTime || activeHero?.startTime);

  return (
    <div className="fixed inset-0 z-[100] bg-[#03060D] text-slate-100 overflow-y-auto w-full h-full min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-200 pb-20">
      
      {/* TOP HUB NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-[#03060D]/90 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        
        {/* Left: Back Button */}
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all group"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </button>

        {/* Center: Brand Pill */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight uppercase">Aver Campaign Hub</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Pool
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Institutional Competitions & Airdrops</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Green Trophy Icon placed before search */}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5" />
          </div>

          {/* Search Toggle */}
          <div className="relative">
            {showSearchInput ? (
              <div className="flex items-center bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-32 sm:w-48"
                  autoFocus
                />
                <button onClick={() => { setShowSearchInput(false); setSearchQuery(''); }} className="text-slate-400 hover:text-white ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowSearchInput(true)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Rewards Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
            <Gift className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">Pool Allocations:</span>
            <span className="font-black text-emerald-400">${totalPoolUSD.toLocaleString()}</span>
          </div>

        </div>

      </header>

      {/* PLATFORM TELEMETRY MARQUEE TICKER */}
      <div className="bg-slate-950 border-b border-white/10 px-4 py-2.5 overflow-hidden flex items-center justify-between text-[11px] font-bold text-slate-400">
        <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar w-full whitespace-nowrap">
          <div className="flex items-center gap-2 text-emerald-400">
            <Coins className="w-3.5 h-3.5" />
            <span>TOTAL ACTIVE POOL: <strong className="text-white">${totalPoolUSD.toLocaleString()} USDT</strong></span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-2 text-blue-400">
            <Users className="w-3.5 h-3.5" />
            <span>ACTIVE GLOBAL TRADERS: <strong className="text-white">{totalTraders.toLocaleString()}</strong></span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-2 text-amber-400">
            <Award className="w-3.5 h-3.5" />
            <span>SETTLED PAYOUTS: <strong className="text-white">$820,500 USDT</strong></span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-2 text-purple-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFICATION ENGINE: <strong className="text-white">100% ON-CHAIN GUARANTEED</strong></span>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-4 space-y-12">

        {/* ============================================================== */}
        {/* SECTION 1: FEATURED CAMPAIGNS (CINEMATIC HERO STAGE) */}
        {/* ============================================================== */}
        {activeHero && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Featured Flagship Campaigns
              </h3>
              
              {/* Carousel Indicators */}
              {featuredEvents.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {featuredEvents.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setHeroIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === heroIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Hero Card Stage */}
            <div 
              className="relative rounded-[32px] overflow-hidden border border-white/15 bg-slate-900/80 shadow-2xl min-h-[420px] sm:min-h-[460px] flex items-end group cursor-pointer"
              onClick={() => activeHero?.id && setSelectedEventId(activeHero.id)}
            >
              {/* Background Trading Image with Multi-layer Vignette */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                style={{ backgroundImage: `url('${activeHero?.bannerUrl || ''}')` }}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${activeHero?.heroGradient || 'from-[#03060D] via-[#03060D]/80 to-transparent'}`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-transparent via-[#03060D]/60 to-[#03060D]" />

              {/* Glowing Background Accent Light */}
              <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none" />

              {/* Hero Inner Content Grid */}
              <div className="relative z-10 w-full p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                
                {/* Left Side: Campaign Specs (8 Cols) */}
                <div className="lg:col-span-8 space-y-4">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {activeHero?.category}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      Live Championship
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                    {activeHero?.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal leading-relaxed line-clamp-2">
                    {activeHero?.subtitle}
                  </p>

                  {/* Countdown Timer Strip */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Remaining:</span>
                      <span className="text-xs font-black text-white">
                        {String(heroTimeLeft.days).padStart(2, '0')}d : {String(heroTimeLeft.hours).padStart(2, '0')}h : {String(heroTimeLeft.mins).padStart(2, '0')}m : {String(heroTimeLeft.secs).padStart(2, '0')}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-black text-white">{activeHeroSim.formattedCount}</span>
                      <span className="text-[10px] font-bold text-slate-400">Traders Enrolled</span>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeHero?.id) setSelectedEventId(activeHero.id);
                      }}
                      className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-xs transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 group-hover:scale-105"
                    >
                      <span>Explore Campaign & Claim Share</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {/* Right Side: Floating Prize Pool Callout Card (4 Cols) */}
                <div className="lg:col-span-4 bg-slate-950/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grand Prize Allocation</span>
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                      ${(activeHero?.totalRewardPool || 0).toLocaleString()} <span className="text-sm text-amber-200">{activeHero?.rewardToken || 'USDT'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Guaranteed distribution directly to user wallet</p>
                  </div>

                  {/* Top Reward Card Sample */}
                  {activeHero?.rewardCards && activeHero.rewardCards[0] && (
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400">{activeHero.rewardCards[0].title}</p>
                        <p className="text-xs font-black text-white">{activeHero.rewardCards[0].amount}</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: LIVE PROMOTIONS (3-COLUMN GLASS MATRIX GRID) */}
        {/* ============================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                Live Promotions & Quests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Participate in active trading tournaments, yield carnivals, and airdrops.</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {livePromotions.length} Live
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {livePromotions.map((item, idx) => {
              const simulated = getEffectiveParticipantCount(item);
              const capacityPct = simulated.percentage;
              return (
                <div 
                  key={`live-${item.id || idx}-${idx}`}
                  onClick={() => setSelectedEventId(item.id)}
                  className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  {/* Top Artwork Thumbnail */}
                  <div className="relative h-44 overflow-hidden bg-slate-950">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url('${item.bannerUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                    {/* Category & Status Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                        {item.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>

                    {/* Reward Pool Highlight */}
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Reward Pool</span>
                      <span className="text-sm font-black text-amber-400">${(item.totalRewardPool || 0).toLocaleString()} {item.rewardToken || 'USDT'}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Participant Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Participants Enrolled</span>
                        <span className="text-white">{simulated.formattedCount} {item.maxParticipants ? `/ ${item.maxParticipants.toLocaleString()}` : `/ ${simulated.formattedMax}`}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" style={{ width: `${capacityPct}%` }} />
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-white hover:text-emerald-400 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-emerald-400">
                      <span>Enter Event</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 3: ENDING SOON SPRINT (HIGH-URGENCY FLASH STRIP) */}
        {/* ============================================================== */}
        {endingSoonEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-amber-400 tracking-tight flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  Ending Soon — Fast Claim Sprints
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Final hours to complete tasks and claim allocations before vault closure.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endingSoonEvents.map((item, idx) => {
                const timeLeft = formatTimeLeft(item.endTime);
                return (
                  <div 
                    key={`ending-${item.id || idx}-${idx}`}
                    onClick={() => setSelectedEventId(item.id)}
                    className="p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900/80 backdrop-blur-xl hover:border-amber-400 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 group shadow-xl shadow-amber-500/5"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 font-black">
                        <Flame className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                          Final Hours
                        </span>
                        <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors mt-1">{item.title}</h4>
                        <p className="text-xs font-extrabold text-amber-400 mt-0.5">${(item.totalRewardPool || 0).toLocaleString()} {item.rewardToken || 'USDT'} Pool</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 w-full sm:w-auto">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Closing In</span>
                        <span className="text-xs font-black text-amber-400">
                          {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.mins).padStart(2, '0')}m : {String(timeLeft.secs).padStart(2, '0')}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SECTION 4: UPCOMING EVENTS (PRE-REGISTRATION LAUNCHPAD CARDS) */}
        {/* ============================================================== */}
        {upcomingEvents.length > 0 && (
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Upcoming Campaigns & Pre-Registration Launchpad
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pre-register now to lock in early-bird reward multipliers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.map((item, idx) => {
                const simulated = getEffectiveParticipantCount(item);
                return (
                <div 
                  key={`upcoming-${item.id || idx}-${idx}`}
                  onClick={() => setSelectedEventId(item.id)}
                  className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 hover:border-blue-500/40 transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 font-black">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                          Pre-Launch
                        </span>
                        <h4 className="font-black text-base text-white group-hover:text-blue-300 transition-colors mt-0.5">{item.title}</h4>
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-400">${(item.totalRewardPool || 0).toLocaleString()} {item.rewardToken || 'USDT'}</span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.subtitle}</p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Pre-Registered: <strong className="text-white">{simulated.formattedCount}</strong></span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        joinEventService(user?.uid, item.id);
                        setSelectedEventId(item.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Pre-Register Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SECTION 5: COMPLETED & SETTLED CAMPAIGNS (VERIFIED VAULT ARCHIVES) */}
        {/* ============================================================== */}
        {completedEvents.length > 0 && (
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-300 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Completed & Settled Vault History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Verified on-chain payout archives and historical tournament winners.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/40 overflow-hidden divide-y divide-white/5">
              {completedEvents.map((item, idx) => {
                const simulated = getEffectiveParticipantCount(item);
                return (
                <div 
                  key={`completed-${item.id || idx}-${idx}`}
                  onClick={() => setSelectedEventId(item.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{simulated.formattedCount} Participants • Settled & Distributed</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-right">
                    <div>
                      <p className="text-xs font-extrabold text-emerald-400">${(item.totalRewardPool || 0).toLocaleString()} {item.rewardToken || 'USDT'}</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Verified Payout</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );})}
            </div>
          </section>
        )}

      </main>

    </div>
  );
}
