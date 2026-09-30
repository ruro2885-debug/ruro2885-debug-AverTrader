import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import CoinLogo from './CoinLogo';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  color: string;
  isUp?: boolean;
  isDown?: boolean;
}

const initialCoins: TickerItem[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67420.50, change: 2.45, color: 'from-amber-400 to-orange-500' },
  { symbol: 'ETH', name: 'Ethereum', price: 3482.20, change: 1.82, color: 'from-blue-500 to-indigo-600' },
  { symbol: 'SOL', name: 'Solana', price: 142.85, change: -0.65, color: 'from-emerald-400 to-teal-500' },
  { symbol: 'AVR', name: 'Aver Token', price: 12.84, change: 14.28, color: 'from-emerald-400 to-teal-400' },
  { symbol: 'BNB', name: 'Binance Coin', price: 585.40, change: 0.95, color: 'from-yellow-400 to-amber-500' },
  { symbol: 'XRP', name: 'Ripple', price: 0.592, change: 3.14, color: 'from-sky-400 to-blue-500' },
  { symbol: 'ADA', name: 'Cardano', price: 0.485, change: -1.22, color: 'from-blue-600 to-indigo-700' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.124, change: 5.76, color: 'from-yellow-500 to-yellow-600' },
];

export default function CryptoTicker() {
  const [coins, setCoins] = useState<TickerItem[]>(initialCoins);
  const { preferences, formatCurrency } = usePreferences();
  const isDark = preferences.theme === 'dark';

  // Simulating live ticking prices
  useEffect(() => {
    const interval = setInterval(() => {
      setCoins((prevCoins) =>
        prevCoins.map((coin) => {
          // 30% chance of price fluctuation for each coin on tick
          if (Math.random() > 0.3) return coin;

          const changePercent = (Math.random() - 0.48) * 0.15; // slightly skewed positive
          const priceDiff = coin.price * (changePercent / 100);
          const newPrice = Math.max(0.01, coin.price + priceDiff);
          const isUp = priceDiff > 0;
          const isDown = priceDiff < 0;

          return {
            ...coin,
            price: newPrice,
            change: coin.change + changePercent,
            isUp,
            isDown,
          };
        })
      );

      // Reset flash effects after 800ms
      setTimeout(() => {
        setCoins((currentCoins) =>
          currentCoins.map((c) => ({ ...c, isUp: false, isDown: false }))
        );
      }, 800);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Multiplied array for infinite loop marquee scrolling
  const tripledCoins = [...coins, ...coins, ...coins];

  return (
    <div 
      className={`fixed top-0 left-0 right-0 h-8 z-50 flex items-center overflow-hidden border-b select-none backdrop-blur-md transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-950/90 border-white/5 text-gray-300' 
          : 'bg-white/90 border-slate-200 text-slate-700 shadow-sm'
      }`}
    >
      {/* Ticker System Badge */}
      <div 
        className={`absolute left-0 top-0 bottom-0 px-4 flex items-center space-x-1.5 z-50 font-mono text-[10px] font-bold tracking-wider uppercase border-r select-none ${
          isDark 
            ? 'bg-slate-900 border-white/5 text-emerald-400' 
            : 'bg-slate-100 border-slate-200 text-emerald-600'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>LIVE</span>
        <span className="hidden sm:inline">TICKER</span>
      </div>

      {/* Marquee Container */}
      <div className="w-full h-full flex items-center pl-[90px] sm:pl-[120px]">
        <div className="animate-marquee flex items-center space-x-8">
          {tripledCoins.map((coin, index) => {
            const upState = coin.isUp;
            const downState = coin.isDown;
            const priceChangeIsPositive = coin.change >= 0;

            let flashClass = '';
            if (upState) {
              flashClass = 'bg-emerald-500/20 text-emerald-400 scale-[1.03]';
            } else if (downState) {
              flashClass = 'bg-red-500/20 text-red-400 scale-[1.03]';
            }

            return (
              <div
                key={`${coin.symbol}-${index}`}
                className={`flex items-center space-x-2 px-2.5 py-0.5 rounded-md transition-all duration-300 ${flashClass}`}
              >
                {/* Visual Symbol Badge Icon */}
                <CoinLogo symbol={coin.symbol} size={20} className="shadow-sm" />

                {/* Coin Info */}
                <span className={`text-[11px] font-mono font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {coin.symbol}
                </span>

                <span 
                  className={`text-[11px] font-mono font-medium transition-colors duration-300 ${
                    upState 
                      ? 'text-emerald-400 font-bold' 
                      : downState 
                      ? 'text-red-400 font-bold' 
                      : isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {formatCurrency(coin.price)}
                </span>

                {/* Price Direction Indicators */}
                <span 
                  className={`flex items-center text-[10px] font-mono font-bold ${
                    priceChangeIsPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {priceChangeIsPositive ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {priceChangeIsPositive ? '+' : ''}
                  {coin.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
