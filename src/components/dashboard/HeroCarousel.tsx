import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SlideContent {
  id: string;
  theme: string;
  renderIllustration: () => React.ReactNode;
}

interface HeroCarouselProps {
  slides: SlideContent[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayTimerRef = useRef<any | null>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isHovered) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }

    return () => stopAutoPlay();
  }, [isHovered, slides.length]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
    // Briefly keep paused on click so user can inspect their selected slide
    setIsHovered(true);
    const timeout = setTimeout(() => setIsHovered(false), 2000);
    return () => clearTimeout(timeout);
  };

  return (
    <div
      className="w-full flex flex-col items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => {
        // Pause briefly after touch ends before resuming auto-play
        const timeout = setTimeout(() => setIsHovered(false), 1500);
        return () => clearTimeout(timeout);
      }}
    >
      {/* Carousel Slide Container */}
      <div className="relative w-full h-[240px] sm:h-[280px] md:h-[320px] flex items-center justify-center overflow-visible">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 25, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -25, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="w-full h-full flex items-center justify-center absolute"
          >
            {slides[currentSlide].renderIllustration()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center items-center gap-2 mt-4 z-20">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <button
              key={slide.id}
              onClick={() => handleDotClick(index)}
              className="focus:outline-none cursor-pointer p-1 group"
              aria-label={`Show ${slide.theme} illustration`}
            >
              <motion.div
                animate={{
                  width: isActive ? 24 : 8,
                  backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                }}
                whileHover={{
                  backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                  scale: isActive ? 1 : 1.15
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                className="h-2 rounded-full shadow-sm"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
