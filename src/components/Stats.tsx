import { useEffect, useState, useRef } from 'react';
import { Activity, ShieldAlert, Zap, Globe } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

interface StatsProps {
  theme: 'light' | 'dark';
}

interface StatItem {
  id: string;
  labelKey: string;
  prefix?: string;
  suffix?: string;
  target: number;
  decimals: number;
  icon: any;
  isCurrency?: boolean;
}

export default function Stats({ theme }: StatsProps) {
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const { t, preferences } = usePreferences();

  // For the currency stat, we apply the exchange rate to the target value
  // and use the currency symbol.
  const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    BTC: 0.000014,
    USDT: 1,
  };
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BTC: '₿',
    USDT: '₮',
  };

  const currentRate = EXCHANGE_RATES[preferences.currency] || 1;
  const currentSymbol = CURRENCY_SYMBOLS[preferences.currency] || '$';

  const statsList: StatItem[] = [
    {
      id: 'vol',
      labelKey: 'stats.volume',
      prefix: currentSymbol,
      suffix: preferences.currency === 'BTC' ? 'M+' : 'B+',
      target: preferences.currency === 'BTC' ? (2.84 * currentRate * 1000) : (2.84 * currentRate), 
      decimals: 2,
      icon: Zap,
      isCurrency: true
    },
    {
      id: 'success',
      labelKey: 'stats.signals',
      suffix: '%',
      target: 98.74,
      decimals: 2,
      icon: Activity
    },
    {
      id: 'latency',
      labelKey: 'stats.latency',
      suffix: 'ms',
      target: 4.12,
      decimals: 2,
      icon: ShieldAlert
    },
    {
      id: 'nodes',
      labelKey: 'nav.security', // Using existing translation for 'nodes' or just generic
      target: 1240,
      decimals: 0,
      icon: Globe
    }
  ];

  // Animated Count States
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    vol: 0,
    success: 0,
    latency: 0,
    nodes: 0
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    const duration = 2000;
    const steps = 50;
    const intervalTime = duration / steps;

    const timers = statsList.map((stat) => {
      const stepIncrement = stat.target / steps;
      return setInterval(() => {
        setCounts((prev) => {
          const nextVal = prev[stat.id] + stepIncrement;
          if (nextVal >= stat.target) {
            return { ...prev, [stat.id]: stat.target };
          }
          return { ...prev, [stat.id]: nextVal };
        });
      }, intervalTime);
    });

    const completionTimer = setTimeout(() => {
      const finalCounts: { [key: string]: number } = {};
      statsList.forEach((stat) => {
        finalCounts[stat.id] = stat.target;
      });
      setCounts(finalCounts);
      timers.forEach((t) => clearInterval(t));
    }, duration + 100);

    return () => {
      timers.forEach((t) => clearInterval(t));
      clearTimeout(completionTimer);
    };
  }, [hasStarted, preferences.currency]);

  return (
    <section id="stats" ref={containerRef} className="py-24 relative overflow-hidden px-6">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop"
          alt="Aver Cyber Encryption Map Backdrop"
          className={`w-full h-full object-cover object-center scale-100 select-none pointer-events-none transition-opacity duration-1000 ${
            isDark ? 'opacity-[0.04]' : 'opacity-[0.02]'
          }`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-emerald-500/5 rounded-full blur-[110px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-xs font-bold font-mono uppercase tracking-[0.15em] text-emerald-400 mb-3">
            {t('stats.badge')}
          </p>
          <h2 className={`font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t('stats.title')}
          </h2>
          <p className={`text-base font-light font-sans max-w-xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('stats.subtitle')}
          </p>
        </div>

        {/* Statistics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsList.map((stat) => {
            const IconComponent = stat.icon;
            const displayValue = stat.decimals > 0 
              ? (counts[stat.id] || 0).toFixed(stat.decimals) 
              : Math.floor(counts[stat.id] || 0).toLocaleString();

            return (
              <div
                key={stat.id}
                className={`p-8 rounded-2xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-black/5 hover:border-emerald-500/20 shadow-md'
                }`}
              >
                <div className="absolute top-4 right-4 text-emerald-400/20">
                  <IconComponent className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold font-mono tracking-widest text-gray-500 uppercase">
                    {t(stat.labelKey)}
                  </p>
                  
                  <div className="flex items-baseline text-white">
                    {stat.prefix && (
                      <span className="font-display text-2xl sm:text-3xl font-semibold text-emerald-400 mr-0.5">
                        {stat.prefix}
                      </span>
                    )}
                    <span className={`font-display text-4xl sm:text-5xl font-extrabold tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {displayValue}
                    </span>
                    {stat.suffix && (
                      <span className="font-display text-2xl sm:text-3xl font-semibold text-emerald-400 ml-0.5">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-[1.5px] bg-gray-800 rounded-full overflow-hidden mt-6">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{
                      width: hasStarted ? '100%' : '0%',
                      transitionDuration: '2000ms'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-16 p-6 rounded-2xl border text-center ${
          isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-black/5 shadow-sm'
        }`}>
          <p className="text-xs text-gray-500 font-mono">
            {t('stats.footnote')}
          </p>
        </div>
      </div>
    </section>
  );
}
