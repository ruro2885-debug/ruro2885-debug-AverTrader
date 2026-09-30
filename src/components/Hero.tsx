import { useState, useEffect } from 'react';
import { Play, ArrowRight, Activity, TrendingUp, Cpu, Target, ShieldAlert, TrendingDown } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import CoinLogo from './CoinLogo';

interface HeroProps {
  theme: 'light' | 'dark';
  onShowcase: () => void;
  onGetStarted: () => void;
}

export default function Hero({ theme, onShowcase, onGetStarted }: HeroProps) {
  const isDark = theme === 'dark';
  const { t, formatCurrency } = usePreferences();

  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [livePrices, setLivePrices] = useState({
    BTC: 67420.50,
    ETH: 3482.20,
    SOL: 142.85,
  });
  const [priceChanges, setPriceChanges] = useState({
    BTC: 2.45,
    ETH: 1.82,
    SOL: -0.65,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Synchronize ticker price shifts
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices((prev) => {
        const btcDelta = (Math.random() - 0.48) * 45;
        const ethDelta = (Math.random() - 0.48) * 3.2;
        const solDelta = (Math.random() - 0.5) * 0.22;

        return {
          BTC: Math.max(1000, prev.BTC + btcDelta),
          ETH: Math.max(100, prev.ETH + ethDelta),
          SOL: Math.max(1, prev.SOL + solDelta),
        };
      });
      
      setPriceChanges((prev) => {
        const btcDelta = (Math.random() - 0.48) * 0.08;
        const ethDelta = (Math.random() - 0.48) * 0.05;
        const solDelta = (Math.random() - 0.48) * 0.05;
        return {
          BTC: prev.BTC + btcDelta,
          ETH: prev.ETH + ethDelta,
          SOL: prev.SOL + solDelta,
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Live Chart Calculations
  const chartData = {
    BTC: [66100, 65400, 65900, 65100, 66300, 65800, 66900, livePrices.BTC],
    ETH: [3390, 3340, 3410, 3380, 3460, 3420, 3450, livePrices.ETH],
    SOL: [141, 138, 145, 139, 142, 140, 144, livePrices.SOL],
  };

  const chartLabels = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 'LIVE'];
  
  const points = chartData[selectedAsset];
  const width = 360;
  const height = 120;
  const paddingX = 15;
  const paddingY = 15;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const valRange = maxVal - minVal || 1;

  const svgPoints = points.map((val, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((val - minVal) / valRange) * (height - 2 * paddingY);
    return { x, y, val, label: chartLabels[idx] };
  });

  const pathD = svgPoints.reduce((acc, p, idx) => {
    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, '');

  const areaD = pathD + ` L ${svgPoints[svgPoints.length - 1].x} ${height} L ${svgPoints[0].x} ${height} Z`;

  return (
    <section id="hero" className="relative min-h-[95vh] flex items-center pt-28 pb-16 overflow-hidden w-full px-6">
      
      {/* Immersive Depth Gradients */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute -top-[10%] -right-[10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none transition-opacity duration-1000 ${
          isDark ? 'opacity-100' : 'opacity-60'
        }`} />
        <div className={`absolute bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none transition-opacity duration-1000 ${
          isDark ? 'opacity-100' : 'opacity-60'
        }`} />
        <div 
          className={`absolute inset-0 z-0 ${
            isDark 
              ? 'bg-gradient-to-t from-[#050505] via-transparent to-slate-950/80'
              : 'bg-gradient-to-t from-white via-transparent to-white/80'
          }`}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full mt-8">
        
        {/* Typography & Call to Action (Left Column) */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          
          {/* Technology Badges */}
          <div className="flex flex-wrap items-center gap-2.5 animate-fade-in">
            <span className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs tracking-wide transition-all shadow-sm ${
              isDark 
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 shadow-emerald-950/30 hover:border-emerald-400/50' 
                : 'border-emerald-600/30 bg-emerald-50/80 text-emerald-800 shadow-emerald-500/10 hover:border-emerald-500/60'
            }`}>
              <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className={isDark ? 'bg-gradient-to-r from-emerald-200 via-emerald-300 to-teal-200 bg-clip-text text-transparent font-semibold' : 'text-emerald-900 font-semibold'}>
                {t('hero.badge.ai')}
              </span>
            </span>

            <span className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs tracking-wide transition-all shadow-sm ${
              isDark 
                ? 'border-teal-500/30 bg-teal-950/40 text-teal-300 shadow-teal-950/30 hover:border-teal-400/50' 
                : 'border-teal-600/30 bg-teal-50/80 text-teal-800 shadow-teal-500/10 hover:border-teal-500/60'
            }`}>
              <Target className="w-3.5 h-3.5 text-teal-400" />
              <span className={isDark ? 'bg-gradient-to-r from-teal-200 via-cyan-200 to-emerald-200 bg-clip-text text-transparent font-semibold' : 'text-teal-900 font-semibold'}>
                {t('hero.badge.peo')}
              </span>
            </span>
          </div>

          {/* Majestic Hero Headings */}
          <h1 className={`font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-6 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <span>
              {t('hero.title.1')}
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t('hero.title.2')}
            </span>
          </h1>

          <p className={`text-base sm:text-lg max-w-xl font-sans font-light leading-relaxed ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('hero.subtitle')}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
            
            {/* Get Started Button */}
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-emerald-500 text-black hover:bg-emerald-400 font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{t('hero.cta.doc')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Explore Platform Button */}
            <button
              onClick={onShowcase}
              className={`px-8 py-4 rounded-lg font-bold border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white backdrop-blur-md hover:bg-white/10'
                  : 'border-slate-300 hover:border-emerald-500/40 text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-emerald-50/50'
              }`}
            >
              <Play className="w-4 h-4 fill-current text-emerald-400" />
              <span>{t('hero.cta.ecosystem')}</span>
            </button>
          </div>

          {/* Under CTAs Trust Badges */}
          <div className={`flex items-center space-x-6 pt-6 border-t w-full max-w-xl ${
            isDark ? 'border-white/5 text-gray-500' : 'border-slate-100 text-gray-400'
          }`}>
            <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>{t('hero.sla')}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-teal-500" />
              <span>{t('hero.security')}</span>
            </div>
          </div>
        </div>

        {/* Futuristic Interactive Glass UI Floating Elements (Right Column) */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end pt-8 lg:pt-0">
          
          {/* Floating Bitcoin Badge */}
          <button 
            onClick={() => setSelectedAsset('BTC')}
            className={`absolute -top-6 left-4 lg:-left-6 z-30 bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-xl flex items-center space-x-3 transition-all duration-300 animate-[bounce_5s_infinite_ease-in-out] pointer-events-auto border ${
              selectedAsset === 'BTC' 
                ? 'border-amber-500 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.45)] ring-2 ring-amber-500/30' 
                : 'border-white/10 hover:border-amber-500/40 hover:scale-105 hover:bg-slate-900'
            }`}
          >
            <CoinLogo symbol="BTC" size={38} className="shadow-md" />
            <div className="text-left">
              <p className="text-[9px] sm:text-[10px] font-bold font-mono text-amber-500 tracking-wider">BTC / USD</p>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">{formatCurrency(livePrices.BTC)}</h4>
            </div>
            <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded ml-1 sm:ml-2 ${
              priceChanges.BTC >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            }`}>
              {priceChanges.BTC >= 0 ? '+' : ''}{priceChanges.BTC.toFixed(2)}%
            </span>
          </button>

          {/* Floating Ethereum Badge */}
          <button 
            onClick={() => setSelectedAsset('ETH')}
            className={`absolute -bottom-8 right-2 lg:-right-6 z-30 bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-xl flex items-center space-x-3 transition-all duration-300 animate-[bounce_7s_infinite_ease-in-out_1.5s] pointer-events-auto border ${
              selectedAsset === 'ETH' 
                ? 'border-indigo-500 scale-105 shadow-[0_0_25px_rgba(99,102,241,0.45)] ring-2 ring-indigo-500/30' 
                : 'border-white/10 hover:border-indigo-500/40 hover:scale-105 hover:bg-slate-900'
            }`}
          >
            <CoinLogo symbol="ETH" size={38} className="shadow-md" />
            <div className="text-left">
              <p className="text-[9px] sm:text-[10px] font-bold font-mono text-indigo-400 tracking-wider">ETH / USD</p>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">{formatCurrency(livePrices.ETH)}</h4>
            </div>
            <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded ml-1 sm:ml-2 ${
              priceChanges.ETH >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            }`}>
              {priceChanges.ETH >= 0 ? '+' : ''}{priceChanges.ETH.toFixed(2)}%
            </span>
          </button>

          {/* Floating Solana Badge */}
          <button 
            onClick={() => setSelectedAsset('SOL')}
            className={`absolute top-1/2 -left-12 lg:-left-16 -translate-y-1/2 z-30 bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-xl flex items-center space-x-3 transition-all duration-300 animate-[bounce_6s_infinite_ease-in-out_0.7s] pointer-events-auto border ${
              selectedAsset === 'SOL' 
                ? 'border-emerald-500 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.45)] ring-2 ring-emerald-500/30' 
                : 'border-white/10 hover:border-emerald-500/40 hover:scale-105 hover:bg-slate-900'
            }`}
          >
            <CoinLogo symbol="SOL" size={38} className="shadow-md" />
            <div className="text-left">
              <p className="text-[9px] sm:text-[10px] font-bold font-mono text-teal-400 tracking-wider">SOL / USD</p>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">{formatCurrency(livePrices.SOL)}</h4>
            </div>
            <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded ml-1 sm:ml-2 ${
              priceChanges.SOL >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            }`}>
              {priceChanges.SOL >= 0 ? '+' : ''}{priceChanges.SOL.toFixed(2)}%
            </span>
          </button>
          
          {/* Main platform showcase panel container */}
          <div className="relative w-full max-w-md aspect-[4/5] sm:aspect-square lg:aspect-auto lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-700 hover:rotate-1 group">
            
            {/* Background Image: Institutional Trader Workstation with charts */}
            <img
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop"
              alt="Aver Premium Command Interface Workstation"
              className="absolute inset-0 w-full h-full object-cover brightness-[0.75] saturate-[1.15] contrast-[1.05] scale-105 transition-all duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            
            {/* Visual gradient overlays for glowing container corners */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
            <div className="absolute inset-0 bg-slate-950/20 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)] rounded-3xl backdrop-blur-md" />
            
            {/* Interactive elements inside the frame */}
            <div className="absolute inset-x-5 bottom-5 top-5 flex flex-col justify-between">
              
              {/* Terminal Title & Tabs */}
              <div className="bg-slate-950/95 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest">AVER CORE TERMINAL</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">P-42 SIGNAL NODE</span>
                </div>
                
                {/* Active Coin Header Info */}
                <div className="flex justify-between items-end">
                  <div className="text-left">
                    <span className="text-[10px] font-bold font-mono text-slate-400 tracking-wider">
                      {selectedAsset === 'BTC' ? 'Bitcoin (BTC)' : selectedAsset === 'ETH' ? 'Ethereum (ETH)' : 'Solana (SOL)'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-none mt-1">
                      {formatCurrency(livePrices[selectedAsset])}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      priceChanges[selectedAsset] >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                    }`}>
                      {priceChanges[selectedAsset] >= 0 ? '▲' : '▼'} {Math.abs(priceChanges[selectedAsset]).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Interactive SVG Sparkline Chart */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex-1 my-3 flex flex-col justify-between relative group/chart overflow-hidden backdrop-blur-lg select-none">
                
                {/* SVG definitions for gradient fills */}
                <svg className="absolute inset-0 w-0 h-0">
                  <defs>
                    <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="ethGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="solGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* SVG Plot Canvas */}
                <div className="relative w-full h-full min-h-[140px] flex-1">
                  <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    className="w-full h-full overflow-visible"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const xPos = e.clientX - rect.left;
                      const ratio = (xPos - paddingX) / (width - 2 * paddingX);
                      const index = Math.round(ratio * (points.length - 1));
                      if (index >= 0 && index < points.length) {
                        setHoverIndex(index);
                      }
                    }}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    {/* Horizontal Dotted Gridlines */}
                    <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                    {/* Gradient Shaded Area */}
                    <path
                      d={areaD}
                      fill={selectedAsset === 'BTC' ? 'url(#btcGrad)' : selectedAsset === 'ETH' ? 'url(#ethGrad)' : 'url(#solGrad)'}
                      className="transition-all duration-500 ease-out"
                    />

                    {/* Glowing Stroke Path */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={selectedAsset === 'BTC' ? '#f59e0b' : selectedAsset === 'ETH' ? '#6366f1' : '#10b981'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500 ease-out"
                    />

                    {/* Static current pulsing state circle indicator */}
                    <circle
                      cx={svgPoints[svgPoints.length - 1].x}
                      cy={svgPoints[svgPoints.length - 1].y}
                      r="5"
                      fill={selectedAsset === 'BTC' ? '#f59e0b' : selectedAsset === 'ETH' ? '#6366f1' : '#10b981'}
                      className="animate-pulse"
                    />
                    <circle
                      cx={svgPoints[svgPoints.length - 1].x}
                      cy={svgPoints[svgPoints.length - 1].y}
                      r="10"
                      fill="none"
                      stroke={selectedAsset === 'BTC' ? '#f59e0b' : selectedAsset === 'ETH' ? '#6366f1' : '#10b981'}
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ animationDuration: '2s' }}
                    />

                    {/* Interactive Hover Indicators */}
                    {hoverIndex !== null && svgPoints[hoverIndex] && (
                      <>
                        {/* Hover vertical dotted line crosshair */}
                        <line
                          x1={svgPoints[hoverIndex].x}
                          y1="0"
                          x2={svgPoints[hoverIndex].x}
                          y2={height}
                          stroke="rgba(255,255,255,0.25)"
                          strokeDasharray="2,2"
                        />
                        {/* Hover circle on chart line */}
                        <circle
                          cx={svgPoints[hoverIndex].x}
                          cy={svgPoints[hoverIndex].y}
                          r="6"
                          fill="#ffffff"
                          stroke={selectedAsset === 'BTC' ? '#f59e0b' : selectedAsset === 'ETH' ? '#6366f1' : '#10b981'}
                          strokeWidth="2.5"
                          className="shadow-lg"
                        />
                      </>
                    )}
                  </svg>

                  {/* HTML Hover Floating Tooltip Inside Canvas */}
                  {hoverIndex !== null && svgPoints[hoverIndex] && (
                    <div 
                      className="absolute bg-slate-950/95 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white font-mono shadow-xl pointer-events-none transition-all duration-100 backdrop-blur-md"
                      style={{
                        left: `${Math.min(width - 90, Math.max(10, svgPoints[hoverIndex].x - 45))}px`,
                        top: `${Math.max(5, svgPoints[hoverIndex].y - 45)}px`
                      }}
                    >
                      <span className="block text-slate-400 font-bold">{svgPoints[hoverIndex].label}</span>
                      <span className="font-extrabold text-emerald-400">{formatCurrency(svgPoints[hoverIndex].val)}</span>
                    </div>
                  )}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mt-1 px-1">
                  <span>09:00</span>
                  <span>11:00</span>
                  <span>13:00</span>
                  <span>15:00</span>
                  <span className="text-emerald-400 animate-pulse">LIVE</span>
                </div>
              </div>

              {/* Terminal Footer System Output Logs */}
              <div className="bg-slate-950/95 border border-white/10 rounded-2xl p-3 flex items-center justify-between backdrop-blur-xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <h5 className="text-[10px] font-extrabold font-mono text-white tracking-wide">PEO™ OPTIMIZER STATUS</h5>
                    <p className="text-[9px] font-mono text-emerald-400">Precision Trade Entry Level: 99.74%</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold font-mono text-slate-500">SIGNAL</span>
                  <span className="text-[10px] font-extrabold font-mono text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">STRONG BUY</span>
                </div>
              </div>

            </div>

            {/* Glowing neon corner bracket accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-400/40 rounded-tl pointer-events-none" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-400/40 rounded-tr pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-400/40 rounded-bl pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-400/40 rounded-br pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
