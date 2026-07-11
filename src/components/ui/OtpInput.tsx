import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { motion } from 'framer-motion';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export default function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
}: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const digit = value.slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    const otp = newValues.join('');
    if (otp.length === length && newValues.every((v) => v !== '')) {
      onComplete(otp);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (values[index] === '' && index > 0) {
        focusInput(index - 1);
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
      } else {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData.length === 0) return;

    const newValues = [...values];
    for (let i = 0; i < pastedData.length; i++) {
      newValues[i] = pastedData[i];
    }
    setValues(newValues);

    const focusIndex = Math.min(pastedData.length, length - 1);
    focusInput(focusIndex);

    if (pastedData.length === length) {
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {values.map((value, index) => (
        <motion.input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`
            w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-display font-bold
            border-2 rounded-[var(--radius-md)] bg-surface-card
            transition-all duration-200 outline-none
            ${
              value
                ? 'border-brand text-ink shadow-[0_0_0_3px_var(--color-brand-glow)]'
                : 'border-border text-ink hover:border-ink-muted'
            }
            focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          whileFocus={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      ))}
    </div>
  );
}
