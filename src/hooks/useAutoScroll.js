import { useEffect, useRef, useState } from 'react';

export function useAutoScroll(items, interval = 4000) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex(p => (p + 1) % items.length);
    }, interval);
  };

  useEffect(() => {
    if (items.length <= 1) return;
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, interval]);

  const goTo = (i) => {
    setIndex(i);
    resetTimer();
  };

  return [index, goTo];
}
