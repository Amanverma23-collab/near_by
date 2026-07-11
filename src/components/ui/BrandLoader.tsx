import { motion } from 'framer-motion';

export default function BrandLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface">
      <motion.div
        className="flex items-center gap-1 mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-3xl font-extrabold font-display text-ink">
          Near
        </span>
        <span className="text-3xl font-extrabold font-display text-brand">
          Be
        </span>
      </motion.div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-brand"
            animate={{
              scale: [0, 1, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
