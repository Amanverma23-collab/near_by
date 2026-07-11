import { motion } from 'framer-motion';

export default function LocationPin() {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Radiating rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full border-2 border-brand/30"
          animate={{
            scale: [0.5, 2.5],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: [0.215, 0.61, 0.355, 1],
          }}
        />
      ))}

      {/* Pin shadow */}
      <motion.div
        className="absolute bottom-4 w-12 h-3 rounded-full bg-ink/10"
        animate={{
          scaleX: [1, 0.8, 1],
          opacity: [0.3, 0.15, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Pin body */}
      <motion.svg
        width="64"
        height="80"
        viewBox="0 0 64 80"
        fill="none"
        className="relative z-10"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Pin shape */}
        <path
          d="M32 0C14.327 0 0 14.327 0 32c0 24 32 48 32 48s32-24 32-48C64 14.327 49.673 0 32 0z"
          fill="url(#pinGradient)"
        />
        {/* Inner circle */}
        <circle cx="32" cy="28" r="14" fill="white" />
        {/* Center dot */}
        <motion.circle
          cx="32"
          cy="28"
          r="7"
          fill="#FF5200"
          animate={{
            r: [6, 8, 6],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <defs>
          <linearGradient id="pinGradient" x1="0" y1="0" x2="64" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF7A3D" />
            <stop offset="1" stopColor="#FF5200" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
