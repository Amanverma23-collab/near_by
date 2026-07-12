import { motion } from 'framer-motion';

interface IconProps {
  color?: string;       // Primary teal
  accentColor?: string; // Accent gold
  isHovered?: boolean;
}

export default function AffordablePriceIcon({ color = '#0D9488', accentColor = '#D97706', isHovered }: IconProps) {
  const clipId = `clip-coin-${Math.random().toString(36).substring(2, 9)}`;
  const gradId = `shine-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={clipId}>
          <circle cx="40" cy="40" r="28" />
        </clipPath>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Coin Base Group with Clip Path */}
      <g clipPath={`url(#${clipId})`}>
        {/* Coin Body Fill */}
        <circle cx="40" cy="40" r="28" fill={`${color}08`} />
        
        {/* Shine Sweep Overlay */}
        <motion.rect
          x="-60"
          y="-60"
          width="35"
          height="180"
          fill={`url(#${gradId})`}
          transform="rotate(25)"
          animate={{
            x: [-60, 140]
          }}
          transition={{
            duration: isHovered ? 1.0 : 2.8,
            repeat: Infinity,
            repeatDelay: isHovered ? 0.2 : 1.5,
            ease: "easeInOut"
          }}
        />
      </g>

      {/* Solid Coin Edge (Bolder border) */}
      <circle cx="40" cy="40" r="28" stroke={color} strokeWidth="5" />

      {/* Inner Ring (Embossed border) */}
      <circle cx="40" cy="40" r="23" stroke={color} strokeWidth="1.5" strokeOpacity="0.45" />

      {/* Rupee Symbol - Bolder & Center aligned */}
      <motion.path
        d="M30 25 H50 M30 33 H47 M38 25 C 47 25, 47 41, 38 41 H34 M38 41 L49 57"
        stroke={accentColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? {
          scale: [1, 1.1, 0.95, 1],
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{ duration: 0.6 }}
        style={{ originX: '40px', originY: '40px' }}
      />
    </svg>
  );
}
