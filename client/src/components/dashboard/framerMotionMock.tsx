import React from 'react';

// Custom lightweight mock replacement for framer-motion to avoid client npm install blockers.
// Implements motion element stubs, AnimatePresence, and the utility animate function using requestAnimationFrame.

export const motion = {
  div: React.forwardRef<HTMLDivElement, any>(({ children, className, initial, animate, exit, transition, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }),
  span: React.forwardRef<HTMLSpanElement, any>(({ children, className, initial, animate, exit, transition, ...props }, ref) => {
    return (
      <span ref={ref} className={className} {...props}>
        {children}
      </span>
    );
  })
};

export const AnimatePresence: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const animate = (from: number, to: number, options: { duration?: number; ease?: string; onUpdate: (value: number) => void }) => {
  const duration = (options.duration || 1) * 1000;
  const start = performance.now();
  let animationFrameId: number;

  const step = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out quad formula: progress * (2 - progress)
    const ease = progress * (2 - progress);
    const currentValue = from + (to - from) * ease;
    
    options.onUpdate(currentValue);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    }
  };

  animationFrameId = requestAnimationFrame(step);

  return {
    stop: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }
  };
};

export default {
  motion,
  AnimatePresence,
  animate
};
