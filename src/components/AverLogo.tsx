import React from 'react';

interface AverLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  theme?: 'dark' | 'light';
}

export default function AverLogo({ className = '', size = 44, showText = true, theme = 'dark' }: AverLogoProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  
  return (
    <div className={`flex items-center space-x-3.5 ${className}`}>
      {/* Textured Hexagonal "Aver" Original Logo with Physical & Digital Grain */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 select-none filter drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
      >
        <defs>
          {/* Noise / Grain Texture Filter to simulate physical bead-blasted metal */}
          <filter id="averMetalNoise" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.12 0" />
            <feComposite operator="in" in2="SourceGraphic" result="textured" />
            <feBlend mode="multiply" in="SourceGraphic" in2="textured" />
          </filter>

          {/* Glowing Green Filter */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Micro-perforated carbon fiber or tech mesh texture pattern */}
          <pattern id="carbonMesh" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="#022c22" fillOpacity="0.1" />
            <circle cx="1.5" cy="1.5" r="0.6" fill="#10b981" fillOpacity="0.25" />
          </pattern>

          {/* Left Facet Bright Brushed Metal Gradient */}
          <linearGradient id="leftBrushedGrad" x1="20" y1="18" x2="50" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="40%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Right Facet Dark/Anodized Metal Gradient */}
          <linearGradient id="rightAnodizedGrad" x1="80" y1="18" x2="50" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          {/* Hexagon Bevel Frame Gradients */}
          <linearGradient id="hexBevelBright" x1="11" y1="5" x2="89" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#047857" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="hexBevelDark" x1="11" y1="5" x2="89" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* Horizontal Milled Lines Clip Paths to apply realistic grooves */}
          <clipPath id="leftFacetClip">
            <path d="M50 18 L50 48 L35 78 L20 78 Z" />
          </clipPath>
          <clipPath id="rightFacetClip">
            <path d="M50 18 L80 78 L65 78 L50 48 Z" />
          </clipPath>
          <clipPath id="hexClip">
            <path d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z" />
          </clipPath>
        </defs>

        {/* 1. Technical Grid/Mesh Background Inside Hexagon */}
        <path
          d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z"
          fill="url(#carbonMesh)"
          stroke="#10b981"
          strokeWidth="1"
          strokeOpacity="0.2"
        />

        {/* 2. Textured Double Outer Hexagon Frame (With Beveled Edge and Milled Lines) */}
        {/* Outer Shadowed Ring */}
        <path
          d="M50 3 L91 26.5 L91 73.5 L50 97 L9 73.5 L9 26.5 Z"
          fill="url(#hexBevelDark)"
          filter="url(#averMetalNoise)"
          opacity="0.95"
        />
        {/* Inner Highlight Ring with Metal Grain */}
        <path
          d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z"
          stroke="url(#hexBevelBright)"
          strokeWidth="2.5"
          filter="url(#averMetalNoise)"
        />

        {/* Inner Tech Tick Marks for Watch-Bezel Texture */}
        <g stroke="#10b981" strokeWidth="1" strokeOpacity="0.45" filter="url(#neonGlow)">
          <line x1="50" y1="5" x2="50" y2="9" />
          <line x1="50" y1="95" x2="50" y2="91" />
          <line x1="11" y1="27.5" x2="14" y2="29" />
          <line x1="89" y1="27.5" x2="86" y2="29" />
          <line x1="11" y1="72.5" x2="14" y2="71" />
          <line x1="89" y1="72.5" x2="86" y2="71" />
        </g>

        {/* 3. Splendid Faceted 3D Beveled "A" Core */}
        {/* LEFT FACET - Anodized Light Emerald with Grain */}
        <path
          d="M50 18 L50 48 L35 78 L20 78 Z"
          fill="url(#leftBrushedGrad)"
          filter="url(#averMetalNoise)"
        />

        {/* Left Facet Fine Grooves / Lathe Milled Lines */}
        <g clipPath="url(#leftFacetClip)" opacity="0.25">
          {Array.from({ length: 30 }).map((_, i) => (
            <line
              key={`left-groove-${i}`}
              x1="10"
              y1={18 + i * 2}
              x2="60"
              y2={18 + i * 2}
              stroke="#ffffff"
              strokeWidth="0.65"
            />
          ))}
        </g>

        {/* RIGHT FACET - Darker Deep Green with Grain */}
        <path
          d="M50 18 L80 78 L65 78 L50 48 Z"
          fill="url(#rightAnodizedGrad)"
          filter="url(#averMetalNoise)"
        />

        {/* Right Facet Fine Grooves / Lathe Milled Lines */}
        <g clipPath="url(#rightFacetClip)" opacity="0.2">
          {Array.from({ length: 30 }).map((_, i) => (
            <line
              key={`right-groove-${i}`}
              x1="40"
              y1={18 + i * 2}
              x2="90"
              y2={18 + i * 2}
              stroke="#000000"
              strokeWidth="0.75"
            />
          ))}
        </g>

        {/* Subtle Highlight line running down the 3D Spine */}
        <line
          x1="50"
          y1="18"
          x2="50"
          y2="48"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
          filter="url(#neonGlow)"
        />

        {/* 4. Glowing Quantum Pulse Center Core */}
        <circle cx="50" cy="48" r="4.5" fill="#34d399" className="animate-pulse" filter="url(#neonGlow)" />
        <circle cx="50" cy="48" r="2.2" fill="#ffffff" />
      </svg>
      
      {/* Premium Brand Title Text */}
      {showText && (
        <div className="flex flex-col items-start leading-none select-none">
          <span className={`font-display font-black tracking-tight text-[22px] sm:text-2xl ${textColor}`}>
            AVER<span className="text-emerald-400 font-extrabold animate-pulse">.</span>
          </span>
        </div>
      )}
    </div>
  );
}
