import { motion } from 'framer-motion';

interface IconProps {
  color?: string;       // Primary teal
  accentColor?: string; // Accent gold
  isHovered?: boolean;
}

export default function DirectCallIcon({ color = '#0D9488', accentColor = '#D97706', isHovered }: IconProps) {
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handset - Solid filled silhouette */}
      <motion.path
        d="M21 51.5C27.5 58 34.5 59.5 38.5 55.5L42 52C43 51 45 51 46 52L53 59C54 60 54 62 53 63L48.5 67.5C43 73 30 66 21.5 57.5S6.5 36 12 30.5L16.5 26C17.5 25 19.5 25 20.5 26L27.5 33C28.5 34 28.5 36 27.5 37L24 40.5C20 44.5 20.5 51 21 51.5Z"
        fill={color}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isHovered ? { 
          rotate: [0, -8, 8, -8, 8, 0],
          scale: [1, 1.06, 0.96, 1.03, 1]
        } : { 
          rotate: [0, -1, 1, -1, 0] 
        }}
        transition={{
          duration: isHovered ? 0.5 : 3.5,
          repeat: isHovered ? 0 : Infinity,
          ease: "easeInOut"
        }}
        style={{ originX: '21px', originY: '51.5px' }}
      />

      {/* Signal Waves - Concentric arcs with fading opacities */}
      {[0, 1, 2].map((idx) => {
        const opacities = [0.95, 0.60, 0.30];
        const pathData = 
          idx === 0 ? "M 53 45 A 18 18 0 0 0 35 27" :
          idx === 1 ? "M 64 45 A 29 29 0 0 0 35 16" :
          "M 75 45 A 40 40 0 0 0 35 5";

        return (
          <motion.path
            key={idx}
            d={pathData}
            stroke={accentColor}
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: opacities[idx], pathLength: 0.8 }}
            animate={{ 
              opacity: [opacities[idx], opacities[idx] * 0.4, opacities[idx]],
              pathLength: [0.8, 1, 0.8]
            }}
            transition={{
              duration: isHovered ? 1.5 : 2.5,
              repeat: Infinity,
              delay: idx * 0.3,
              ease: "easeInOut"
            }}
          />
        );
      })}
    </svg>
  );
}
