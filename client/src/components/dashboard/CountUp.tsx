import React, { useEffect, useState } from 'react';
import { animate } from './framerMotionMock';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  formatter?: (val: number) => string;
}

export const CountUp: React.FC<CountUpProps> = ({ to, from = 0, duration = 1, formatter }) => {
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate(value) {
        setDisplayValue(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [from, to, duration]);

  return <span>{formatter ? formatter(displayValue) : displayValue}</span>;
};

export default CountUp;
