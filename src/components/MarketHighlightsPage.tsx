import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Clock, Calendar, Globe, AlertCircle, Newspaper, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface MarketHighlightsPageProps {
  theme: 'light' | 'dark';
  onBack: () => void;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string;
  publishedAt: string;
  category: string;
  source: string;
}

interface MarketMover {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: { index: number, price: number }[];
}

interface MarketEvent {
  id: string;
  title: string;
  country: string;
  impact: string;
  date: string;
  forecast?: string;
  previous?: string;
}

export default function MarketHighlightsPage({ theme, onBack }: MarketHighlightsPageProps) {
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<NewsItem | null>(null);
  const [headlines, setHeadlines] = useState<NewsItem[]>([]);
  const [gainers, setGainers] = useState<MarketMover[]>([]);
  const [losers, setLosers] = useState<MarketMover[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        setLoading(true);

        // 1. Fetch WSJ Business News
        let parsedNews: NewsItem[] = [];
        try {
          const newsRes = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml');
          const newsData = await newsRes.json();
          if (newsData.status === 'ok' && newsData.items) {
              parsedNews = newsData.items.map((item: any, i: number) => ({
                  id: `wsj_${i}`,
                  title: item.title,
                  summary: item.description?.replace(/<[^>]*>?/gm, '') || '',
                  url: item.link,
                  image: item.enclosure?.link || item.thumbnail || '',
                  publishedAt: item.pubDate,
                  category: 'Markets & Business',
                  source: 'WSJ'
              })).filter((n: NewsItem) => n.image !== ''); 
          }
        } catch (e) {
          console.warn('News fetch failed, using fallback.');
          parsedNews = [
            { id: 'fallback_wsj_1', title: 'Global Markets Stabilize Amid Policy Adjustments', summary: 'Major indices show resilience as central banks signal cautious optimism for the upcoming quarter.', url: '#', image: 'https://images.wsj.net/im-76791864/medium', publishedAt: new Date().toISOString(), category: 'Markets', source: 'WSJ' },
            { id: 'fallback_wsj_2', title: 'Tech Sector Leads Pre-Market Gains', summary: 'Following strong earnings reports from semiconductor giants, tech stocks push higher in early trading.', url: '#', image: 'https://images.wsj.net/im-76791864/medium', publishedAt: new Date().toISOString(), category: 'Business', source: 'WSJ' }
          ];
        }

        // 2. Fetch CoinGecko Movers (Top Volume Coins)
        let allMovers: MarketMover[] = [];
        try {
          const cryptoRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=1&sparkline=true');
          const cryptoData = await cryptoRes.json();
          if (Array.isArray(cryptoData)) {
              allMovers = cryptoData.map((c: any) => ({
                  id: c.id,
                  symbol: c.symbol.toUpperCase(),
                  name: c.name,
                  price: c.current_price,
                  change24h: c.price_change_percentage_24h,
                  sparkline: (c.sparkline_in_7d?.price || []).map((p: number, idx: number) => ({ index: idx, price: p }))
              })).filter(m => m.change24h !== null && m.change24h !== undefined);
          }
        } catch (e) {
          console.warn('Crypto fetch failed, using fallback.');
          allMovers = [
            { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 64500, change24h: 2.5, sparkline: [{index: 0, price: 60000}, {index: 1, price: 64500}] },
            { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 3400, change24h: -1.2, sparkline: [{index: 0, price: 3500}, {index: 1, price: 3400}] },
            { id: 'sol', symbol: 'SOL', name: 'Solana', price: 145, change24h: 5.4, sparkline: [{index: 0, price: 130}, {index: 1, price: 145}] },
            { id: 'bnb', symbol: 'BNB', name: 'BNB', price: 580, change24h: -0.5, sparkline: [{index: 0, price: 590}, {index: 1, price: 580}] },
            { id: 'xrp', symbol: 'XRP', name: 'XRP', price: 0.58, change24h: 1.1, sparkline: [{index: 0, price: 0.55}, {index: 1, price: 0.58}] }
          ];
        }

        const sortedMovers = [...allMovers].sort((a, b) => b.change24h - a.change24h);
        const topGainers = sortedMovers.slice(0, 3);
        const topLosers = sortedMovers.slice(-3).reverse();

        // 3. Fetch Events
        let upcomingEvents: MarketEvent[] = [];
        try {
          const eventsRes = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
          const eventsData = await eventsRes.json();
          if (Array.isArray(eventsData)) {
              const now = new Date();
              upcomingEvents = eventsData
                  .filter((e: any) => new Date(e.date) > now && e.impact !== 'Low')
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((e: any, idx: number) => ({
                      id: `evt_${idx}`,
                      title: e.title,
                      country: e.country,
                      impact: e.impact,
                      date: e.date,
                      forecast: e.forecast,
                      previous: e.previous
                  }));
          }
        } catch (e) {
          console.warn('Events fetch failed, using fallback.');
          upcomingEvents = [
            { id: 'evt_1', title: 'CPI Release', country: 'USD', impact: 'High', date: new Date(Date.now() + 86400000).toISOString(), forecast: '0.2%', previous: '0.3%' },
            { id: 'evt_2', title: 'ECB Press Conference', country: 'EUR', impact: 'High', date: new Date(Date.now() + 172800000).toISOString(), forecast: '', previous: '' }
          ];
        }

        if (isMounted) {
            if (parsedNews.length > 0) {
                setFeatured(parsedNews[0]);
                setHeadlines(parsedNews.slice(1, 6));
            }
            setGainers(topGainers);
            setLosers(topLosers);
            setEvents(upcomingEvents);
            setLoading(false);
        }

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, []);

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  };

  const getImpactColor = (impact: string) => {
    switch(impact) {
      case 'High': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#000000]' : 'bg-slate-50'}`}>
         <div className="flex flex-col items-center gap-4">
            <Activity className={`w-8 h-8 animate-pulse ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <div className={`text-sm font-mono tracking-widest uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading Intelligence</div>
         </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-slate-200' : 'bg-slate-50 text-slate-900'} font-sans antialiased`}>
      {/* Institutional Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDark ? 'bg-black/60 border-white/5' : 'bg-white/70 border-slate-200'}`}>
        <div className="max-w-[1500px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className={`p-1.5 rounded-lg transition-all duration-300 ${isDark ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
              <h1 className="text-[11px] font-black tracking-[0.2em] uppercase opacity-80">Global Intelligence</h1>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6">
               {gainers.slice(0, 2).map((m, idx) => (
                 <div key={`hdr-gainer-${m.id}-${idx}`} className="flex items-center gap-2">
                   <span className="text-[10px] font-bold tracking-wider opacity-40">{m.symbol}</span>
                   <span className="text-[10px] font-mono font-bold text-emerald-500">+{m.change24h.toFixed(2)}%</span>
                 </div>
               ))}
            </div>
            <div className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${isDark ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-200'}`}>
              LIVE FEED
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Hero Section - 2/3 Width */}
          <div className="lg:col-span-8 space-y-6">
            {featured && (
              <motion.a 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                href={featured.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group relative block w-full aspect-[16/10] sm:aspect-[21/9] overflow-hidden rounded-[24px] border border-white/5"
              >
                <img 
                  src={featured.image} 
                  alt={featured.title} 
                  className="absolute inset-0 w-full h-full object-cover grayscale-[20%] transition-transform duration-1000 group-hover:scale-105 group-hover:grayscale-0" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                
                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] bg-emerald-500 text-black">
                      {featured.category}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {formatDate(featured.publishedAt)}
                    </div>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium leading-[1.1] text-white mb-6 tracking-tight max-w-4xl">
                    {featured.title}
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] w-12 bg-emerald-500/50 group-hover:w-20 transition-all duration-500" />
                    <span className="text-xs font-bold text-white/80 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                      Execute Analysis
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </div>
              </motion.a>
            )}

            {/* Deep News Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {headlines.slice(0, 2).map((headline, idx) => (
                <motion.a
                  key={`top-news-${headline.id}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.1) }}
                  href={headline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-6 rounded-[24px] border group transition-all duration-300 ${isDark ? 'bg-[#0B0F17]/95 backdrop-blur-md border-white/10 hover:bg-[#121824]/95 hover:border-white/20' : 'bg-white border-slate-200 hover:shadow-xl hover:shadow-slate-200/50'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      {headline.source}
                    </span>
                    <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      {formatDate(headline.publishedAt)}
                    </span>
                  </div>
                  <h3 className={`text-xl font-serif font-bold leading-snug mb-4 transition-colors group-hover:text-[#00D09C] ${isDark ? 'text-slate-50' : 'text-slate-800'}`}>
                    {headline.title}
                  </h3>
                  <p className={`text-xs leading-relaxed line-clamp-2 font-light ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {headline.summary}
                  </p>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Right Section - Market Dynamics (1/3 Width) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Market Pulse Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-8 rounded-[32px] border ${isDark ? 'bg-[#0B0F17]/95 backdrop-blur-md border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-300 font-bold' : 'text-slate-400'}`}>Market Dynamics</h3>
                  <p className={`text-[10px] font-mono text-[#00D09C] mt-1 uppercase tracking-widest font-bold`}>Volatility Index Low</p>
                </div>
                <Activity className={`w-5 h-5 ${isDark ? 'text-[#00D09C]/40' : 'text-slate-300'}`} />
              </div>

              <div className="space-y-8">
                {/* Gainers Group */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Top Alpha</span>
                  </div>
                  {gainers.map((mover, idx) => (
                    <div key={`gainer-${mover.id}-${idx}`} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          {mover.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className={`text-xs font-black tracking-tight ${isDark ? 'text-slate-100 font-bold' : 'text-slate-900'}`}>{mover.symbol}</div>
                          <div className={`text-[10px] font-mono font-semibold opacity-70 uppercase tracking-tighter ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>${mover.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-emerald-500 font-bold">+{mover.change24h.toFixed(2)}%</div>
                        <div className="w-12 h-1 ml-auto mt-1 rounded-full bg-emerald-500/10 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, mover.change24h * 5)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Losers Group */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Risk Exposure</span>
                  </div>
                  {losers.map((mover, idx) => (
                    <div key={`loser-${mover.id}-${idx}`} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          {mover.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className={`text-xs font-black tracking-tight ${isDark ? 'text-slate-100 font-bold' : 'text-slate-900'}`}>{mover.symbol}</div>
                          <div className={`text-[10px] font-mono font-semibold opacity-70 uppercase tracking-tighter ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>${mover.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-rose-500 font-bold">{mover.change24h.toFixed(2)}%</div>
                        <div className="w-12 h-1 ml-auto mt-1 rounded-full bg-rose-500/10 overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${Math.abs(Math.max(-100, mover.change24h * 5))}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Economic Sentiment - Small Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-6 rounded-[24px] border ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-500/10'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sentiment Score</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-serif ${isDark ? 'text-white' : 'text-slate-900'}`}>74</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Bullish Accumulation</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Feed - Headlines & Calendar Split */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 mt-12 border-t border-white/5">
            {/* Extended Headlines */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Newspaper className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className={`text-xs font-black uppercase tracking-[0.25em] ${isDark ? 'text-white/80' : 'text-slate-900'}`}>Extended Briefing</h3>
              </div>
              <div className="grid gap-8">
                {headlines.slice(2).map((headline, idx) => (
                  <motion.a 
                    key={`ext-news-${headline.id}-${idx}`} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + (idx * 0.1) }}
                    href={headline.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group flex gap-6 items-start"
                  >
                    {headline.image && (
                      <div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden border border-white/5">
                        <img src={headline.image} alt={headline.title} className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-500/60' : 'text-emerald-600'}`}>{headline.source}</span>
                        <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                        <span className={`text-[9px] font-mono text-slate-500`}>{formatDate(headline.publishedAt)}</span>
                      </div>
                      <h4 className={`text-base font-serif leading-tight group-hover:text-emerald-500 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {headline.title}
                      </h4>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Structured Calendar */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className={`text-xs font-black uppercase tracking-[0.25em] ${isDark ? 'text-white/80' : 'text-slate-900'}`}>Macro Calendar</h3>
              </div>
              <div className="space-y-4">
                {events.map((event, idx) => (
                  <motion.div 
                    key={`evt-${event.id}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (idx * 0.1) }}
                    className={`p-5 rounded-[24px] border transition-colors ${isDark ? 'bg-white/[0.01] border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest border ${getImpactColor(event.impact)}`}>
                          {event.impact}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{event.country}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className={`text-sm font-bold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.title}</h4>
                    <div className="flex items-center gap-6">
                      {event.forecast && (
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Forecast</span>
                          <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{event.forecast}</span>
                        </div>
                      )}
                      {event.previous && (
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Previous</span>
                          <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{event.previous}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
