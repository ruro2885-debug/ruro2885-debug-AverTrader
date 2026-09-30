import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Shield, Activity, TrendingUp } from 'lucide-react';
import AverLogo from './AverLogo';

interface LoaderProps {
  onComplete: () => void;
}

export default function Loader({ onComplete }: LoaderProps) {
  const [statusText, setStatusText] = useState('ESTABLISHING SECURE CONNECTION...');
  const [fadeOut, setFadeOut] = useState(false);

  // High-performance micro particles that drift upward to create an ambient, sophisticated space
  const [particles] = useState(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // horizontal percentage
      y: Math.random() * 100, // vertical percentage
      size: Math.random() * 2 + 1, // 1px to 3px
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 4, // 4s to 7s drift
    }))
  );

  useEffect(() => {
    // Elegant timing sequencer for the premium startup sequence
    const t1 = setTimeout(() => {
      setStatusText('CALIBRATING AVERCORE AI™ ENGINES...');
    }, 700);

    const t2 = setTimeout(() => {
      setStatusText('SYNCHRONIZING SECURE PORTFOLIO NODES...');
    }, 1400);

    const t3 = setTimeout(() => {
      setStatusText('SYSTEM STATUS: SECURED & OPERATIONAL');
    }, 2100);

    // Signal completion to parent after the sequence finishes
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      key="loader-container"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] bg-[#020204] flex flex-col items-center justify-center overflow-hidden select-none"
    >
          {/* Subtle Financial Grid Texture */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
          
          {/* Multi-layered Soft Brand Radial Light Glows */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.07)_0%,transparent_65%)] pointer-events-none z-0 animate-pulse duration-[4000ms]" />
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/3 rounded-full blur-[140px] pointer-events-none z-0" />

          {/* Premium Market Trend Guideline Lines (Self-Drawing Behind the Core) */}
          <svg className="absolute inset-x-0 bottom-[30%] h-40 w-full opacity-[0.06] pointer-events-none z-0" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <motion.path
              d="M 0 140 Q 150 110 300 130 T 600 80 T 900 140 T 1200 70"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
            />
            <motion.path
              d="M 0 80 Q 200 120 400 60 T 800 130 T 1200 90"
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut", delay: 0.15 }}
            />
          </svg>

          {/* Drift Particles Layer */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {particles.map((p) => (
              <motion.div
                key={`p-${p.id}`}
                className="absolute rounded-full bg-emerald-400/30"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                }}
                animate={{
                  y: [-10, -80],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Connected Network/AI Constellation Nodes */}
          <div className="absolute w-[450px] h-[350px] pointer-events-none z-10 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 450 350">
              {/* Node connecting lines */}
              <motion.line
                x1="225" y1="175" x2="70" y2="60"
                stroke="rgba(16, 185, 129, 0.08)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
              />
              <motion.line
                x1="225" y1="175" x2="380" y2="80"
                stroke="rgba(16, 185, 129, 0.08)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.7, ease: "easeOut", delay: 0.1 }}
              />
              <motion.line
                x1="225" y1="175" x2="60" y2="280"
                stroke="rgba(16, 185, 129, 0.08)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
              />
              <motion.line
                x1="225" y1="175" x2="390" y2="290"
                stroke="rgba(16, 185, 129, 0.08)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.9, ease: "easeOut", delay: 0.3 }}
              />
            </svg>

            {/* Satellite network nodes */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
              className="absolute left-[70px] top-[60px] -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute left-[70px] top-[60px] -translate-x-1/2 -translate-y-1/2 rounded-full w-1.5 h-1.5 bg-emerald-400 animate-ping opacity-30" />
              <span className="font-mono text-[7px] text-gray-600 tracking-wider">QUANT_NODE_A</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              className="absolute left-[380px] top-[80px] -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute left-[380px] top-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full w-1.5 h-1.5 bg-emerald-400 animate-ping opacity-30" />
              <span className="font-mono text-[7px] text-gray-600 tracking-wider">AI_CO_PROC</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
              className="absolute left-[60px] top-[280px] -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute left-[60px] top-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full w-1.5 h-1.5 bg-emerald-400 animate-ping opacity-30" />
              <span className="font-mono text-[7px] text-gray-600 tracking-wider">SECURE_TUNNEL</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
              className="absolute left-[390px] top-[290px] -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute left-[390px] top-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full w-1.5 h-1.5 bg-emerald-400 animate-ping opacity-30" />
              <span className="font-mono text-[7px] text-gray-600 tracking-wider">FEED_INBOUND</span>
            </motion.div>
          </div>

          {/* Central Animated Content Block */}
          <div className="relative z-20 flex flex-col items-center max-w-lg px-6">
            
            {/* Perfectly Sharp Vector Logo Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-28 h-28 flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#181920]/60 to-[#0a0b0d]/80 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.06)] overflow-hidden"
            >
              {/* Premium Metallic/Glass Reflection Sweep */}
              <motion.div
                initial={{ x: '-160%', skewX: -20 }}
                animate={{ x: '160%' }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-30"
              />

              {/* Vector Logo Structure */}
              <AverLogo size={85} showText={false} theme="dark" />
            </motion.div>

            {/* Platform Brand Name using ExtraBold Premium Typography */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-5xl font-extrabold tracking-[0.25em] text-white text-center mt-7 pl-[0.25em]"
            >
              AVER<span className="text-emerald-400">.</span>
            </motion.h1>

            {/* Sub-label for brand presentation */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-[10px] font-bold tracking-[0.35em] text-emerald-500/50 font-mono uppercase text-center mt-3 pl-[0.35em]"
            >
              INTELLIGENT ECOSYSTEM
            </motion.p>

            {/* Subtle Horizontal Metric Accents (Micro-Telemetry Frame) */}
            <div className="flex items-center space-x-12 mt-12 opacity-30">
              <div className="flex flex-col items-center">
                <span className="font-mono text-[8px] text-gray-500">LATENCY</span>
                <span className="font-mono text-[9px] text-emerald-400 font-bold">1.2ms</span>
              </div>
              <div className="w-[1px] h-6 bg-emerald-500/20" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[8px] text-gray-500">SECURITIES</span>
                <span className="font-mono text-[9px] text-emerald-400 font-bold">AES-GCM</span>
              </div>
              <div className="w-[1px] h-6 bg-emerald-500/20" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-[8px] text-gray-500">VERSION</span>
                <span className="font-mono text-[9px] text-emerald-400 font-bold">v4.2.1</span>
              </div>
            </div>

            {/* Live Telemetry Process Log Output */}
            <div className="mt-14 h-8 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={statusText}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="flex items-center space-x-2.5"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-emerald-400 uppercase">
                    {statusText}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

          {/* Decorative Corner Framing Ornaments */}
          <div className="absolute top-8 left-8 w-6 h-6 border-t border-l border-white/5 pointer-events-none" />
          <div className="absolute top-8 right-8 w-6 h-6 border-t border-r border-white/5 pointer-events-none" />
          <div className="absolute bottom-8 left-8 w-6 h-6 border-b border-l border-white/5 pointer-events-none" />
          <div className="absolute bottom-8 right-8 w-6 h-6 border-b border-r border-white/5 pointer-events-none" />
    </motion.div>
  );
}
