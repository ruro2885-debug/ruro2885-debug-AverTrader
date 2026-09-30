import { useState } from 'react';
import { Cpu, Sparkles, Shield, RefreshCw } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

interface TechInnovationsProps {
  theme: 'light' | 'dark';
}

export default function TechInnovations({ theme }: TechInnovationsProps) {
  const isDark = theme === 'dark';
  const { t } = usePreferences();
  
  // Interactive Simulation State
  const [optimizerActive, setOptimizerActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'avercore' | 'peo' | 'security'>('avercore');

  // Simulated entry analysis data
  const rawDataPoints = [42, 38, 45, 32, 48, 30, 52, 44, 49, 35, 54, 48];
  const optimizedDataPoints = [42, 40, 42, 35, 41, 33, 44, 43, 45, 39, 47, 46];
  
  // Exact high probability nodes detected by PEO
  const peoSignals = [
    { index: 5, value: 30, label: 'Optimal Entry 1 (Buy)', type: 'BUY' },
    { index: 10, value: 54, label: 'Optimal Exit (Sell)', type: 'SELL' }
  ];

  const tabs = [
    {
      id: 'avercore',
      title: 'AverCore AI™ Engine',
      subtitle: 'Platform’s Exclusive Intelligence Core',
      icon: Cpu,
      description: 'The neural foundation of the Aver ecosystem. AverCore AI™ handles massive multi-source financial pipelines, performing natural language sentiment audits, statistical modeling, and system self-optimization in milliseconds.',
      features: [
        'Dynamic neural sentiment weighting',
        'Multi-vector deep reinforcement training',
        'Sub-millisecond data pipelines',
        'Autonomous load and telemetry scaling'
      ]
    },
    {
      id: 'peo',
      title: 'Precision Entry Optimizer™ (PEO™)',
      subtitle: 'Intelligent Decision Optimization System',
      icon: Sparkles,
      description: 'Our core mathematical marvel. The Precision Entry Optimizer™ (PEO™) evaluates real-time asset volatility and volume dispersion, suppressing market noise to execute hyper-accurate buy and sell signals.',
      features: [
        'Advanced noise-filtering spectral models',
        'Volume dispersion variance tracking',
        'Dynamic entry price risk mitigation',
        'Adaptive execution feedback loop'
      ]
    },
    {
      id: 'security',
      title: 'Adaptive Cyber-Armor',
      subtitle: 'Self-Shielding Defense Architecture',
      icon: Shield,
      description: 'Trust is the ultimate priority. Our military-grade security suite dynamically modifies access points and encryption tunnels in response to local environment risks, protecting client assets with absolute vigilance.',
      features: [
        'Quantum-resistant TLS tunnels',
        'Fully isolated zero-knowledge key vaults',
        'Dynamic real-time anomaly blocking',
        'Biometric-backed session validation'
      ]
    }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <section id="tech" className="py-24 relative overflow-hidden px-6">
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-1/2 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none`} />
        <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none`} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold font-mono uppercase tracking-[0.15em] text-emerald-400 mb-3">
            {t('tech.badge')}
          </p>
          <h2 className={`font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t('tech.title')}
          </h2>
          <p className={`text-base font-light font-sans max-w-2xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('tech.subtitle')}
          </p>
        </div>

        {/* Tab & Interactive Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Column: Navigation & Content */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Minimalist Tabs */}
            <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-xl border ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center py-3 px-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? isDark 
                        ? 'bg-slate-900 shadow-md text-white border border-white/5' 
                        : 'bg-white shadow-md text-slate-900 border border-black/5'
                      : isDark
                        ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                        : 'text-gray-500 hover:bg-black/5 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span className="text-[10px] font-bold font-mono tracking-wide text-center uppercase truncate w-full">{tab.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Content Display */}
            <div className={`p-8 rounded-2xl border flex-1 flex flex-col justify-between ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="mb-6">
                  <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
                    <currentTab.icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {currentTab.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1 mb-4">
                    <p className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                      {currentTab.subtitle}
                    </p>
                  </div>
                  
                  <p className={`text-sm font-light leading-relaxed font-sans ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {currentTab.description}
                  </p>
                </div>
              </div>

              <ul className="space-y-3 pt-4 border-t border-white/5">
                {currentTab.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className={`text-xs font-sans ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Interactive Visualizer */}
          <div className="lg:col-span-7">
            <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col h-full relative overflow-hidden ${
              isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-900 border-slate-800'
            }`}>
              {/* Subtle tech background grid */}
              <div className="absolute inset-0 bg-slate-900/50 opacity-20 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h4 className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Live Signal Filtration Model
                  </h4>
                  <p className="text-xs text-gray-500 font-sans mt-1">
                    Comparing raw market feed vs PEO™ isolated logic
                  </p>
                </div>
                
                <button
                  onClick={() => setOptimizerActive(!optimizerActive)}
                  className={`px-4 py-2 rounded-full text-xs font-bold font-mono tracking-wide transition-all cursor-pointer flex items-center space-x-1.5 ${
                    optimizerActive 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${optimizerActive ? 'animate-spin duration-3000' : ''}`} />
                  <span>{optimizerActive ? 'PEO ACTIVE' : 'PEO OFFLINE'}</span>
                </button>
              </div>

              {/* Chart Simulation Box */}
              <div className={`p-4 rounded-2xl border flex-1 min-h-[220px] flex flex-col justify-between relative ${
                isDark ? 'bg-black/50 border-white/5' : 'bg-black/80 border-slate-700'
              }`}>
                {/* Y-Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                  {[0, 1, 2, 3].map((_, i) => (
                    <div key={i} className="w-full border-b border-gray-600 border-dashed" />
                  ))}
                </div>

                {/* SVG Chart Container */}
                <div className="relative w-full h-full mt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                    
                    {/* Raw Volatility Line (Always slightly visible, red when active, dim when inactive) */}
                    <path
                      d={`M ${rawDataPoints.map((val, idx) => `${idx * 36.3},${100 - val}`).join(' L ')}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      className={`transition-all duration-500 ${optimizerActive ? 'opacity-30' : 'opacity-100'}`}
                    />

                    {/* PEO Optimized Line (Visible only when active) */}
                    <path
                      d={`M ${optimizedDataPoints.map((val, idx) => `${idx * 36.3},${100 - val}`).join(' L ')}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      className={`transition-all duration-500 ${optimizerActive ? 'opacity-100' : 'opacity-0'}`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Nodes marking entry/exit */}
                    {optimizerActive && peoSignals.map((signal, idx) => (
                      <g key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 0.2}s` }}>
                        <circle
                          cx={signal.index * 36.3}
                          cy={100 - optimizedDataPoints[signal.index]}
                          r="4"
                          className={signal.type === 'BUY' ? 'fill-emerald-400' : 'fill-teal-400'}
                        />
                        <circle
                          cx={signal.index * 36.3}
                          cy={100 - optimizedDataPoints[signal.index]}
                          r="12"
                          className={signal.type === 'BUY' ? 'fill-emerald-400/20' : 'fill-teal-400/20'}
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* X-Axis Time Labels */}
                <div className="flex justify-between mt-4 text-[9px] font-mono text-gray-600 px-2">
                  <span>-60m</span>
                  <span>-45m</span>
                  <span>-30m</span>
                  <span>-15m</span>
                  <span>Live</span>
                </div>
              </div>

              {/* Status Footer */}
              <div className={`mt-6 p-4 rounded-2xl flex items-start space-x-3 border ${
                isDark ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/10'
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${optimizerActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <div>
                  <p className={`text-xs font-semibold ${optimizerActive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {optimizerActive ? 'Signal Optimization Online' : 'Warning: High Market Noise Detected'}
                  </p>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    {optimizerActive 
                      ? 'PEO is actively filtering price volatility. Institutional routing pathways are optimal.' 
                      : 'Raw market feed exposed. Standard deviation exceeds recommended algorithmic thresholds.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
