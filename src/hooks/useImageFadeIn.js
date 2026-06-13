import { useState, useRef } from 'react';

export function useImageFadeIn() {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  const onLoad = () => setLoaded(true);

  return [ref, loaded, onLoad];
}
