import { motion } from 'framer-motion';

interface IconProps {
  color?: string;       // Primary teal
  accentColor?: string; // Accent gold
  isHovered?: boolean;
}

export default function VerifiedBadgeIcon({ color = '#0D9488', accentColor = '#D97706', isHovered }: IconProps) {
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Subtle drop shadow for shield depth */}
        <filter id="shield-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor={color} floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Shield Base Fill */}
      <path
        d="M40 68s26-13 26-32V20L40 10 14 20v16c0 19 26 32 26 32z"
        fill={`${color}08`}
      />

      {/* Shield Outline with drop shadow & pulse glow */}
      <motion.path
        d="M40 68s26-13 26-32V20L40 10 14 20v16c0 19 26 32 26 32z"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#shield-shadow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1,
          stroke: color
        }}
        transition={{
          pathLength: { duration: 1.2, ease: "easeOut" },
          opacity: { duration: 0.6 }
        }}
      />

      {/* Inner accent contour line */}
      <motion.path
        d="M40 62s21-11 21-27V24L40 15 19 24v11c0 16 21 27 21 27z"
        stroke={`${color}20`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      />

      {/* Checkmark drawing in on entrance */}
      <motion.path
        d="M28 39L37 48L52 29"
        stroke={accentColor}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: 0.8,
          duration: 0.8,
          ease: "easeInOut"
        }}
      />
    </svg>
  );
}
