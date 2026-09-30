import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { 
  ArrowLeft, ArrowRight, Pause, Play, ChevronLeft, 
  Activity, Shield, Wallet, Cpu, BarChart3, Lock,
  TrendingUp, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePreferences } from '../contexts/PreferencesContext';

interface PlatformShowcaseProps {
  theme: Theme;
  onBack: () => void;
  onGetStarted?: () => void;
  key?: string;
}

const MODULES = [
  {
    id: 'dashboard',
    title: 'AI Trading Dashboard',
    icon: Activity,
    explanation: 'A comprehensive command center that aggregates market data, open positions, and execution metrics into a single, unified interface.',
    capabilities: [
      'Real-time multi-exchange order book visualization',
      'One-click trade execution with smart routing',
      'Dynamic margin and leverage tracking'
    ],
    benefits: 'Enables rapid decision-making by eliminating screen clutter and presenting only actionable, high-priority data.',
    aiRole: 'AverCore AI™ continuously adjusts the dashboard layout based on market volatility and the user\'s historical trading patterns.',
  },
  {
    id: 'portfolio',
    title: 'Smart Portfolio Management',
    icon: BarChart3,
    explanation: 'An automated wealth tracking system that monitors cross-asset allocations and calculates real-time risk exposure across your entire portfolio.',
    capabilities: [
      'Automated rebalancing recommendations',
      'Historical performance attribution and benchmarking',
      'Tax-optimized lot selection modeling'
    ],
    benefits: 'Reduces manual oversight and ensures your portfolio remains aligned with your long-term risk tolerance.',
    aiRole: 'AverCore AI™ runs millions of Monte Carlo simulations per minute to predict potential portfolio drawdowns before they occur.',
  },
  {
    id: 'intelligence',
    title: 'AI Market Intelligence',
    icon: Globe,
    explanation: 'A global socio-economic scanner that parses news, regulatory filings, and social sentiment to identify emerging market trends.',
    capabilities: [
      'Natural language processing of real-time news feeds',
      'Social sentiment divergence tracking',
      'Macro-economic event impact forecasting'
    ],
    benefits: 'Keeps you ahead of the curve by surfacing hidden catalysts and potential market-moving events before they reflect in price.',
    aiRole: 'AverCore AI™ cross-references linguistic patterns with historical market reactions to generate proprietary confidence scores.',
  },
  {
    id: 'wallet',
    title: 'Secure Wallet & Deposit Center',
    icon: Wallet,
    explanation: 'A fully integrated, multi-currency custody solution that bridges traditional fiat banking pipelines with decentralized blockchain networks.',
    capabilities: [
      'Instant fiat-to-crypto conversion routing',
      'Yield-generating idle capital allocation',
      'Multi-signature withdrawal approval flows'
    ],
    benefits: 'Consolidates all financial assets into a single, highly liquid ecosystem without sacrificing institutional-grade security.',
    aiRole: 'AverCore AI™ optimizes network gas fees and routes deposits through the most efficient liquidity pools available.',
  },
  {
    id: 'assistant',
    title: 'Aver Core AI Assistant',
    icon: Cpu,
    explanation: 'An interactive, conversational neural network designed to act as your personal quantitative analyst and platform guide.',
    capabilities: [
      'Context-aware query resolution and support',
      'Custom algorithm generation via natural language',
      'On-demand technical analysis summaries'
    ],
    benefits: 'Democratizes complex quantitative analysis by allowing users to interact with institutional data using everyday language.',
    aiRole: 'AverCore AI™ is the foundation of this module, utilizing advanced LLMs fine-tuned specifically on financial and regulatory datasets.',
  },
  {
    id: 'security',
    title: 'Security Center',
    icon: Shield,
    explanation: 'The command module for managing platform access, cryptographic keys, and active defense mechanisms protecting your account.',
    capabilities: [
      'Zero-knowledge hardware key integration',
      'Biometric authentication threshold management',
      'Real-time anomaly detection and session termination'
    ],
    benefits: 'Provides absolute peace of mind by granting you total control over the defensive perimeter of your assets.',
    aiRole: 'AverCore AI™ monitors session telemetry globally to proactively identify and neutralize sophisticated cyber threats.',
  }
];

export default function PlatformShowcase({ theme, onBack, onGetStarted }: PlatformShowcaseProps) {
  const isDark = theme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = usePreferences();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [cinematicStatus, setCinematicStatus] = useState('ESTABLISHING SECURE CONNECTION...');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroActive(false);
    }, 2000);

    const t1 = setTimeout(() => {
      setCinematicStatus('CALIBRATING AVERCORE AI™ ENGINES...');
    }, 650);

    const t2 = setTimeout(() => {
      setCinematicStatus('SYNCHRONIZING INTERFACE NODES...');
    }, 1350);

    return () => {
      clearTimeout(timer);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MODULES.length);
    }, 8000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (isIntroActive) return;
    if (isPlaying) {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [isPlaying, currentIndex, isIntroActive]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % MODULES.length);
    if (isPlaying) startTimer();
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + MODULES.length) % MODULES.length);
    if (isPlaying) startTimer();
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const activeModule = MODULES[currentIndex];
  const ModuleIcon = activeModule.icon;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'} pb-24 overflow-x-hidden`}
    >
      {/* Cinematic Transition Overlay */}
      <AnimatePresence>
        {isIntroActive && (
          <motion.div
            key="cinematic-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-[#020204] z-[9999] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Ambient Background Grid and Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_65%)] z-0 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(16,185,129,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.2)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
            
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

            {/* 3D Stage Composition */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, rotateX: 10 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center w-full max-w-4xl h-[450px] z-10 perspective-2000"
            >
              {/* Desktop Monitor (Center Background) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 50, rotateY: -10, rotateX: 10, z: -100 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0, rotateX: 0, z: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="w-[560px] h-[320px] rounded-2xl border-[10px] border-[#181a20] bg-[#050508] relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.85),0_0_80px_rgba(16,185,129,0.06)] flex flex-col z-10 transform-gpu"
              >
                {/* Screen reflection glossy sweep */}
                <motion.div
                  initial={{ x: '-150%', skewX: -20 }}
                  animate={{ x: '250%' }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-40 mix-blend-overlay"
                />

                {/* Desktop Screen Top Bar */}
                <div className="h-6 w-full flex items-center px-3 space-x-1.5 bg-slate-950 border-b border-white/5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500/75" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/75" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/75" />
                  <div className="flex-1 text-center pr-8">
                    <span className="text-[8px] font-mono font-bold tracking-wider text-gray-500">AVERCORE.NET // DECENTRALIZED NODE</span>
                  </div>
                </div>

                {/* Monitor Content */}
                <div className="flex-1 p-5 flex flex-col justify-between relative">
                  {/* Subtle pulsing background logo */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent)] animate-pulse" />
                  
                  <div className="flex justify-between items-start border-b border-emerald-500/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">AverCore AI™ Engine Active</span>
                    </div>
                    <span className="text-[8px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">NODE_ONLINE</span>
                  </div>

                  {/* Self-drawing Line Chart */}
                  <div className="flex-1 flex flex-col justify-center my-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-mono text-gray-500">REAL-TIME EXECUTION BENCHMARK</span>
                      <span className="text-[8px] font-mono text-emerald-400 font-bold">100% RELIABILITY</span>
                    </div>
                    <div className="relative w-full h-16 border-b border-white/5 flex items-end">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 540 64" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M 0 50 L 50 35 L 100 45 L 150 20 L 200 40 L 250 15 L 300 30 L 350 10 L 400 35 L 450 12 L 500 25 L 540 5"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="600"
                          strokeDashoffset="600"
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
                        />
                        <motion.path
                          d="M 0 50 L 50 35 L 100 45 L 150 20 L 200 40 L 250 15 L 300 30 L 350 10 L 400 35 L 450 12 L 500 25 L 540 5 L 540 64 L 0 64 Z"
                          fill="url(#chart-grad)"
                          opacity="0.8"
                        />
                      </svg>
                      {/* Pulse node */}
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2 }}
                        className="absolute right-[15px] bottom-[52px] w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"
                      >
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] font-mono text-emerald-500/50">
                    <span>PORTFOLIO FEED: ENCRYPTED PORT_3000</span>
                    <span className="flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                      <span>LIVE TELEMETRY ACTIVE</span>
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Tablet Mockup (Bottom Right Foreground Overlay) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: 100, y: 80, rotateY: 15, rotateX: 8, z: 80 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotateY: 0, rotateX: 0, z: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="w-[210px] h-[280px] rounded-[1.5rem] border-[8px] border-[#12141a] bg-[#050508] absolute -bottom-6 -right-6 z-20 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9),-10px_10px_40px_rgba(16,185,129,0.05)] flex flex-col transform-gpu"
              >
                {/* Screen reflection glossy sweep */}
                <motion.div
                  initial={{ x: '-150%', skewX: -20 }}
                  animate={{ x: '250%' }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1.7, delay: 0.2 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-40 mix-blend-overlay"
                />

                <div className="flex-1 p-4 flex flex-col justify-between relative">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-wider">CO-PROCESSOR MATRIX</span>
                  </div>

                  {/* Circular scanning radar */}
                  <div className="flex-1 flex items-center justify-center relative my-3">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                      className="w-20 h-20 rounded-full border border-emerald-500/15 border-t-emerald-400 flex items-center justify-center relative"
                    >
                      <div className="w-14 h-14 rounded-full border border-emerald-500/10 border-b-emerald-400 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400/80" />
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <span className="text-[7px] font-mono text-center text-emerald-500/60 uppercase tracking-widest">CALIBRATING SHIFT MARGINS</span>
                </div>
              </motion.div>

              {/* Smartphone Mockup (Bottom Left Foreground Overlay) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: -100, y: 80, rotateY: -15, rotateX: -8, z: 120 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotateY: 0, rotateX: 0, z: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="w-[140px] h-[250px] rounded-[2rem] border-[10px] border-[#0f1115] bg-[#050508] absolute -bottom-8 -left-8 z-30 overflow-hidden shadow-[0_30px_50px_rgba(0,0,0,0.9),10px_10px_30px_rgba(16,185,129,0.05)] flex flex-col transform-gpu"
              >
                {/* Screen reflection glossy sweep */}
                <motion.div
                  initial={{ x: '-150%', skewX: -20 }}
                  animate={{ x: '250%' }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1.9, delay: 0.4 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-40 mix-blend-overlay"
                />

                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-3.5 flex justify-center z-50">
                  <div className="w-16 h-full rounded-b-lg bg-[#0f1115]" />
                </div>

                <div className="flex-1 p-3 pt-6 flex flex-col justify-between items-center text-white relative">
                  <Shield className="w-7 h-7 text-emerald-400/90 animate-bounce pt-1" />
                  
                  <div className="flex flex-col items-center space-y-1.5 w-full my-3">
                    <span className="text-[7px] font-mono text-emerald-400 animate-pulse uppercase tracking-widest">DECRYPTING CODES</span>
                    <div className="w-16 h-1 bg-emerald-950 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
                        className="w-1/2 h-full bg-emerald-400 rounded-full shadow-[0_0_4px_#10b981]"
                      />
                    </div>
                  </div>

                  <span className="text-[6px] font-mono text-center text-gray-500 uppercase tracking-wider">AverCore Key V4</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Bottom Immersive Process Indicator */}
            <div className="absolute bottom-12 flex flex-col items-center space-y-3 z-10">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <motion.span 
                  key={cinematicStatus}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase"
                >
                  {cinematicStatus}
                </motion.span>
              </div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                DO NOT INTERRUPT THE SECURE TUNNEL // INSTITUTIONAL ENCRYPTION ACTIVE
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: isIntroActive ? 0 : 1, y: isIntroActive ? -12 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDark ? 'border-white/5 bg-black/50' : 'border-slate-200 bg-white/70'}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={onBack}
            className={`flex items-center space-x-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Main</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className={`text-xs font-mono px-3 py-1.5 rounded-full ${isDark ? 'bg-white/5 text-gray-300' : 'bg-black/5 text-gray-600'}`}>
              Platform Showcase
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 pt-12 lg:pt-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
          
          {/* Device Mockups (Left Column) */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[500px]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div 
              initial={{ scale: 0.94, rotateY: -4, rotateX: 2 }}
              animate={{ scale: 1, rotateY: 0, rotateX: 0 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl aspect-video perspective-1000"
            >
              {/* Cinematic diagonal light reflection sweep */}
              {isIntroActive && (
                <motion.div 
                  initial={{ x: '-100%', y: '-100%' }}
                  animate={{ x: '100%', y: '100%' }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent pointer-events-none z-40 mix-blend-overlay"
                />
              )}

              {/* Desktop Monitor */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.85, z: -100, rotateX: 10, rotateY: -8, y: 30 }}
                animate={{ opacity: 1, scale: 1, z: 0, rotateX: 0, rotateY: 0, y: 0 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute inset-0 z-10 rounded-xl shadow-2xl border-[10px] overflow-hidden transform-gpu flex flex-col ${isDark ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-[#fafafa] border-[#d4d4d4]'}`}
                style={{ boxShadow: isDark ? '0 30px 60px -12px rgba(0,0,0,0.8)' : '0 30px 60px -12px rgba(0,0,0,0.3)' }}
              >
                {/* Desktop Top Bar */}
                <div className={`h-6 w-full flex items-center px-3 space-x-2 ${isDark ? 'bg-gray-950' : 'bg-gray-300'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                {/* Desktop Content */}
                <div className="flex-1 relative overflow-hidden p-6 flex flex-col">
                  <AnimatePresence mode="wait">
                    {isIntroActive ? (
                      <motion.div
                        key="intro-monitor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 bg-gray-950 p-6 flex flex-col justify-between text-white"
                      >
                        <div className="flex items-center justify-between border-b border-emerald-500/15 pb-4">
                          <div className="flex items-center space-x-2">
                            <Cpu className="w-5 h-5 text-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">AverCore AI™ Sandbox v4.5</span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-500">DECOUPLED NODE // LIVE RECONCILIATION</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center space-y-3 relative overflow-hidden my-4">
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent)] animate-pulse" />
                          <div className="space-y-2 max-w-sm">
                            <div className="h-2 w-1/3 rounded bg-emerald-500/20 animate-pulse" />
                            <div className="h-8 w-full rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center px-3">
                              <span className="text-[9px] font-mono text-emerald-400">INITIALIZING SECURE PORTFOLIO SEED STREAM...</span>
                            </div>
                          </div>
                          <div className="w-full h-12 flex items-end gap-1.5 opacity-40">
                            {[30, 65, 45, 90, 55, 75, 40, 60, 85, 35, 50].map((h, i) => (
                              <motion.div
                                key={i}
                                initial={{ height: '0%' }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.04 }}
                                className="flex-1 bg-gradient-to-t from-emerald-500 to-transparent rounded-t-sm"
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-emerald-500/50 uppercase">
                          <span>SYSTEM: AUTONOMOUS MATRIX SECURE</span>
                          <span className="animate-pulse flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                            <span>SYNCHRONIZING</span>
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeModule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="flex-1 flex flex-col"
                      >
                        <div className="flex items-center space-x-3 mb-6">
                          <activeModule.icon className="w-8 h-8 text-emerald-400" />
                          <h3 className="font-display font-bold text-2xl">{activeModule.title}</h3>
                        </div>
                        
                        {/* Fake UI Skeleton */}
                        <div className="flex-1 flex gap-4">
                          <div className={`w-1/3 rounded-xl p-4 flex flex-col gap-3 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                            <div className={`h-20 w-full rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                            <div className={`h-20 w-full rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                          </div>
                          <div className={`flex-1 rounded-xl p-4 flex flex-col ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            <div className={`h-4 w-1/4 rounded mb-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                            <div className={`flex-1 rounded-lg w-full overflow-hidden relative ${isDark ? 'bg-gradient-to-t from-emerald-500/20 to-transparent' : 'bg-gradient-to-t from-emerald-500/10 to-transparent'}`}>
                               {/* Fake chart bars */}
                               <div className="absolute bottom-0 left-4 w-8 h-1/2 bg-emerald-400/50 rounded-t" />
                               <div className="absolute bottom-0 left-16 w-8 h-3/4 bg-emerald-400/50 rounded-t" />
                               <div className="absolute bottom-0 left-28 w-8 h-1/4 bg-emerald-400/50 rounded-t" />
                               <div className="absolute bottom-0 left-40 w-8 h-5/6 bg-emerald-400/50 rounded-t" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Tablet Mockup */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: 80, y: 60, rotate: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className={`absolute -right-16 -bottom-16 z-20 w-72 h-[380px] rounded-[1.75rem] shadow-2xl border-[10px] transform-gpu flex flex-col overflow-hidden ${isDark ? 'bg-[#0a0a0a] border-[#151515] ring-1 ring-white/10' : 'bg-[#fafafa] border-[#e0e0e0] ring-1 ring-black/10'}`}
                style={{ boxShadow: isDark ? '-15px 25px 50px rgba(0,0,0,0.9)' : '-15px 25px 50px rgba(0,0,0,0.3)' }}
              >
                <div className="flex-1 relative p-4 flex flex-col">
                  <AnimatePresence mode="wait">
                    {isIntroActive ? (
                      <motion.div
                        key="intro-tablet"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 bg-gray-950 p-4 flex flex-col justify-between text-white"
                      >
                        <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">PORTFOLIO CO-PROCESSOR</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center relative my-3">
                          {/* Circular Radar Sweep */}
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
                            className="w-24 h-24 rounded-full border border-emerald-500/20 border-t-emerald-500/80 flex items-center justify-center"
                          >
                            <div className="w-16 h-16 rounded-full border border-emerald-500/10 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full border border-emerald-500/5 bg-emerald-500/5" />
                            </div>
                          </motion.div>
                        </div>
                        <span className="text-[8px] font-mono text-center text-emerald-500/40 uppercase tracking-wider">CALIBRATING REAL-TIME SHIFT MARGINS</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeModule.id + "-tablet"}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex-1 flex flex-col"
                      >
                         <div className="flex items-center space-x-2 mb-4">
                          <activeModule.icon className="w-5 h-5 text-emerald-400" />
                          <h4 className="font-display font-bold text-sm truncate">{activeModule.title}</h4>
                        </div>
                        <div className={`flex-1 rounded-xl p-3 flex flex-col gap-2 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                          <div className={`h-3 w-3/4 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                          <div className={`h-8 w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                          <div className={`h-8 w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                          <div className={`h-8 w-full rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Smartphone Mockup */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: -80, y: 50, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                className={`absolute -left-12 -bottom-10 z-30 w-44 h-[340px] rounded-[2.5rem] shadow-2xl border-[12px] transform-gpu flex flex-col overflow-hidden ${isDark ? 'bg-[#0a0a0a] border-[#111] ring-1 ring-white/10' : 'bg-[#fff] border-[#e5e5e5] ring-1 ring-black/10'}`}
                style={{ boxShadow: isDark ? '20px 20px 50px rgba(0,0,0,0.9)' : '20px 20px 50px rgba(0,0,0,0.3)' }}
              >
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-4 flex justify-center z-50">
                  <div className={`w-1/2 h-full rounded-b-xl ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 relative p-4 pt-8 flex flex-col">
                  <AnimatePresence mode="wait">
                    {isIntroActive ? (
                      <motion.div
                        key="intro-phone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 bg-gray-950 p-4 pt-8 flex flex-col justify-between items-center text-white"
                      >
                        <Shield className="w-10 h-10 text-emerald-400 animate-bounce pt-2" />
                        <div className="space-y-2 text-center w-full">
                          <div className="text-[8px] font-mono text-emerald-400 animate-pulse uppercase tracking-widest">DECRYPTING KEY</div>
                          <div className="h-1 w-20 bg-emerald-950 rounded-full overflow-hidden mx-auto">
                            <motion.div 
                              initial={{ x: '-100%' }}
                              animate={{ x: '100%' }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                              className="h-full w-1/2 bg-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                        <span className="text-[7px] font-mono text-emerald-500/40 uppercase tracking-wider">ISOLATED ENCLAVE</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeModule.id + "-phone"}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex-1 flex flex-col items-center justify-center"
                      >
                        <activeModule.icon className="w-12 h-12 text-emerald-400 mb-4" />
                        <div className={`h-2 w-2/3 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        <div className={`h-2 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        
                        <div className={`mt-6 w-16 h-16 rounded-full border-4 flex items-center justify-center ${isDark ? 'border-emerald-500/30' : 'border-emerald-500/50'}`}>
                          <div className="w-8 h-8 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

            </motion.div>
          </div>

          {/* Information Panel (Right Column) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: isIntroActive ? 0 : 1, x: isIntroActive ? 20 : 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center space-y-8"
          >
            
            {/* Header */}
            <div>
              <motion.div 
                key={activeModule.id + "title"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 mb-4"
              >
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ModuleIcon className="w-6 h-6" />
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
                  {activeModule.title}
                </h2>
              </motion.div>
              <p className={`text-lg font-sans font-light leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {activeModule.explanation}
              </p>
            </div>

            {/* Details */}
            <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
              
              <div>
                <h4 className={`text-xs font-mono font-bold tracking-wider uppercase mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Primary Capabilities
                </h4>
                <ul className="space-y-2">
                  {activeModule.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span className={`text-sm font-sans ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`text-xs font-mono font-bold tracking-wider uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  User Benefit
                </h4>
                <p className={`text-sm font-sans ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {activeModule.benefits}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <h4 className="flex items-center space-x-2 text-xs font-mono font-bold tracking-wider uppercase mb-2 text-emerald-500">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AverCore AI™ Integration</span>
                </h4>
                <p className={`text-sm font-sans ${isDark ? 'text-gray-300' : 'text-emerald-900'}`}>
                  {activeModule.aiRole}
                </p>
              </div>

            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrev}
                  className={`p-3 rounded-full border transition-colors ${isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-900'}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={togglePlay}
                  className={`p-3 rounded-full border transition-colors ${isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-900'}`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                  onClick={handleNext}
                  className={`p-3 rounded-full border transition-colors ${isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-900'}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className={`text-xs font-bold font-mono tracking-wider uppercase ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Preview {currentIndex + 1} of {MODULES.length}
              </div>
            </div>

          </motion.div>
        </div>

        {/* Final CTA */}
        {currentIndex === MODULES.length - 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-24 p-12 text-center rounded-3xl border ${isDark ? 'bg-gradient-to-b from-slate-900 to-black border-white/10' : 'bg-gradient-to-b from-slate-100 to-white border-slate-200'}`}
          >
            <h3 className="font-display font-bold text-3xl mb-4">{t("show.ready.title")}</h3>
            <p className={`max-w-2xl mx-auto font-sans font-light mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t("show.ready.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => {
                  if (onGetStarted) {
                    onGetStarted();
                  } else {
                    onBack();
                    setTimeout(() => {
                      const el = document.getElementById('preview');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all shadow-lg flex items-center space-x-2 cursor-pointer"
              >
                <span>{t("auth.register")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  if (onGetStarted) {
                    onGetStarted();
                  } else {
                    onBack();
                  }
                }}
                className={`px-8 py-4 rounded-full font-bold transition-all cursor-pointer ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
              >
                {t("auth.signin")}
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
