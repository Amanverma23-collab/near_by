import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: AnimatedButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-display font-semibold transition-colors duration-200 select-none';

  const variants = {
    primary:
      'bg-brand text-white hover:bg-brand-dark shadow-brand disabled:opacity-50 disabled:shadow-none',
    secondary:
      'bg-brand-50 text-brand hover:bg-brand-100 disabled:opacity-50',
    ghost:
      'bg-transparent text-ink hover:bg-border-light disabled:opacity-50',
    outline:
      'border-2 border-brand bg-transparent text-brand hover:bg-brand/5 disabled:opacity-50',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2 rounded-[var(--radius-sm)] gap-1.5',
    md: 'text-base px-6 py-3 rounded-[var(--radius-md)] gap-2',
    lg: 'text-lg px-8 py-4 rounded-[var(--radius-lg)] gap-2.5',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <motion.div
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <span className="ml-2">Please wait...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
