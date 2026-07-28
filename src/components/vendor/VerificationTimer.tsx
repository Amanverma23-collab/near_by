import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VerificationTimerProps {
  requestedAt: string | null;
}

export default function VerificationTimer({ requestedAt }: VerificationTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!requestedAt) return;

    const requestedTime = new Date(requestedAt).getTime();
    const twoHours = 2 * 60 * 60 * 1000;
    const targetTime = requestedTime + twoHours;

    const calculateTimeLeft = () => {
      const difference = targetTime - Date.now();
      return difference > 0 ? difference : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const nextTime = calculateTimeLeft();
      setTimeLeft(nextTime);
      if (nextTime === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [requestedAt]);

  if (timeLeft === null) return null;

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center justify-center p-3.5 bg-teal-50/70 border border-teal-100/50 rounded-2xl max-w-sm mx-auto shadow-sm">
        <div className="flex items-center gap-2.5 text-teal-700 font-display font-bold text-xs sm:text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          Almost there — final review in progress
        </div>
      </div>
    );
  }

  // Format time: HH:MM:SS
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="inline-flex items-center gap-3 px-5 py-3 bg-teal-50/80 border border-teal-100/60 rounded-2xl shadow-sm">
      {/* Clock icon with ticking second-hand */}
      <div className="relative flex items-center justify-center bg-teal-100/40 p-1.5 rounded-xl text-teal-600">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
          <motion.line
            x1="12"
            y1="12"
            x2="12"
            y2="7"
            stroke="#0D9488"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{ originX: "12px", originY: "12px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-wider text-teal-600/80 font-display font-extrabold">Time Remaining</div>
        <div className="text-2xl font-mono font-extrabold text-teal-950 tracking-wider">
          {formatNumber(hours)}:{formatNumber(minutes)}:{formatNumber(seconds)}
        </div>
      </div>
    </div>
  );
}
