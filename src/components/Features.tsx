import { Zap, ShieldCheck, BarChart3, Database, Globe, Network, Lock, Layers } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

interface FeaturesProps {
  theme: 'light' | 'dark';
}

export default function Features({ theme }: FeaturesProps) {
  const isDark = theme === 'dark';
  const { t } = usePreferences();

  const secondaryFeatures = [
    {
      title: 'Decentralized Data Oracles',
      icon: Globe,
      description: 'Ingesting verified pricing data from over 40 global institutional nodes.'
    },
    {
      title: 'Deep Execution Liquidity',
      icon: Database,
      description: 'Aggregated pools ensuring near-zero slippage for high-volume transactions.'
    },
    {
      title: 'Multi-Signature Vaults',
      icon: Lock,
      description: 'Requires distributed consensus for core system changes, ensuring protocol integrity.'
    },
    {
      title: 'Microservice Expansion',
      icon: Layers,
      description: 'Plug-and-play architecture allows rapid deployment of new analytical models.'
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden px-6">
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none`} />
        <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-[100px] pointer-events-none`} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-xs font-bold font-mono uppercase tracking-[0.15em] text-emerald-400 mb-3">
            {t('feat.badge')}
          </p>
          <h2 className={`font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t('feat.title')}
          </h2>
          <p className={`text-base font-light font-sans max-w-xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('feat.subtitle')}
          </p>
        </div>

        {/* Feature Section 1: Algorithmic Routing (Alternating: Text Left, Photo Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-28">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-2">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {t('feat.routing_title')}
            </h3>
            <p className={`text-sm sm:text-base font-light leading-relaxed font-sans ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {t('feat.routing_desc')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Latency Optimized</h4>
                <p className="text-xs text-gray-500">Average execution ping &lt; 0.8ms to primary nodes.</p>
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Smart Order Split</h4>
                <p className="text-xs text-gray-500">Automatically fragments large allocations to mask intent.</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            {/* Cinematic Photo Frame: Network/Trading Display */}
            <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[16/10]">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
              <img
                src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop"
                alt="Aver Trading Optimization Dashboards"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                  Live Analytics Display
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section 2: Adaptive Security & Encrypted Infrastructure (Alternating: Photo Left, Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-28 lg:flex-row-reverse">          
          <div className="lg:col-span-6 lg:order-2 space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 text-teal-400 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {t('feat.security_title')}
            </h3>
            <p className={`text-sm sm:text-base font-light leading-relaxed font-sans ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {t('feat.security_desc')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Military-Grade Encryption</h4>
                <p className="text-xs text-gray-500">AES-256-GCM hardware key isolation across multi-signature clusters.</p>
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Anomaly Blockers</h4>
                <p className="text-xs text-gray-500">Autonomous AI firewalls isolate suspicious network actions in real-time.</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 lg:order-1">
            {/* Cinematic Photo Frame: Server Room */}
            <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[16/10]">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
              <img
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop"
                alt="Aver Secure Multi-Cloud Data Servers"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                  Secure Server Cluster
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section 3: Deep Analytics Dashboard (Alternating: Text Left, Photo Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-2">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {t('feat.quantum_title')}
            </h3>
            <p className={`text-sm sm:text-base font-light leading-relaxed font-sans ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {t('feat.quantum_desc')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Advanced Volatility Metrics</h4>
                <p className="text-xs text-gray-500">Live indicators displaying real-time relative strength index and volume delta.</p>
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Dynamic Backtesting</h4>
                <p className="text-xs text-gray-500">Instantly stress-test historical conditions with the AverCore simulator.</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            {/* Cinematic Photo Frame: Wide monitors displaying charts */}
            <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[16/10]">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"
                alt="Aver Advanced Portfolio Performance Visualizer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                  AverCore Predictive Console
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid layout for secondary capabilities */}
        <div className="mt-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h3 className={`font-display text-2xl font-bold tracking-tight mb-3 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Platform Extensibility & Expansion
            </h3>
            <p className={`text-sm font-sans font-light ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Our microservices are built on highly scalable standards, ensuring rapid adaptability and endless expansion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {secondaryFeatures.map((item, index) => (
              <div 
                key={index}
                className={`p-6 rounded-2xl border transition-all group ${
                  isDark 
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' 
                    : 'bg-white border-black/5 hover:border-emerald-500/30 hover:bg-slate-50 shadow-sm hover:shadow'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 inline-block mb-4 transition-transform group-hover:scale-110">
                  <item.icon className="w-5 h-5" />
                </div>
                <h4 className={`text-base font-semibold tracking-tight mb-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
