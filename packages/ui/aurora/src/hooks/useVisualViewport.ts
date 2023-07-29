//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

export const useVisualViewport = (deps?: Parameters<typeof useEffect>[1]) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setWidth(window.visualViewport.width);
        setHeight(window.visualViewport.height);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, deps ?? []);

  return { width, height };
};
