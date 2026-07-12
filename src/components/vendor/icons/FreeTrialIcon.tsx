import { motion } from 'framer-motion';

interface IconProps {
  color?: string;       // Primary teal
  accentColor?: string; // Accent gold
  isHovered?: boolean;
}

export default function FreeTrialIcon({ color = '#0D9488', accentColor = '#D97706', isHovered }: IconProps) {
  const radius = 25;
  const circumference = 2 * Math.PI * radius; // ~157.08
  const targetOffset = circumference * (1 - 0.30); // 30% filled = 70% offset

  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Track Circle (Teal with low opacity) */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        stroke={color}
        strokeWidth="5"
        strokeOpacity="0.15"
      />

      {/* Solid Teal Outline (Thin inner ring for design depth) */}
      <circle
        cx="40"
        cy="40"
        r={radius - 4}
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.25"
      />

      {/* Gold Arc (Animate filling up to 30% on entrance, then pulse) */}
      <motion.circle
        cx="40"
        cy="40"
        r={radius}
        stroke={accentColor}
        strokeWidth="5"
        strokeLinecap="round"
        transform="rotate(-90 40 40)" // Start at 12 o'clock
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ 
          strokeDashoffset: targetOffset
        }}
        transition={{
          duration: 1.5,
          ease: "easeOut"
        }}
      />

      {/* Extra subtle outer gold pulse glow on hover */}
      <motion.circle
        cx="40"
        cy="40"
        r={radius + 4}
        stroke={accentColor}
        strokeWidth="1.5"
        initial={{ opacity: 0 }}
        animate={isHovered ? {
          opacity: [0, 0.4, 0],
          scale: [1, 1.05, 1]
        } : { opacity: 0 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Center Text "30" */}
      <text
        x="40"
        y="41"
        textAnchor="middle"
        fill={color}
        fontSize="22"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        30
      </text>

      {/* Center Subtext "DAYS FREE" */}
      <text
        x="40"
        y="52"
        textAnchor="middle"
        fill={accentColor}
        fontSize="6.5"
        fontWeight="800"
        letterSpacing="0.06em"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        DAYS FREE
      </text>
    </svg>
  );
}
