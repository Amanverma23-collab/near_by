import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export default function PasswordInput({
  label,
  error,
  id,
  className = '',
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-light font-body"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`
            w-full px-4 py-3 pr-12 text-base font-body
            bg-surface-card border-2 rounded-[var(--radius-md)]
            transition-all duration-200 outline-none
            border-border hover:border-ink-muted
            focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]
            ${error ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(229,62,62,0.2)]' : ''}
            ${className}
          `}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error && (
        <p className="text-sm text-error font-body">{error}</p>
      )}
    </div>
  );
}
