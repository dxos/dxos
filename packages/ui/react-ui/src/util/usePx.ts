//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

const getDocumentElementFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

/**
 * React hook that converts rem values to pixels and updates when the root font size changes.
 *
 * @param rem The rem value to convert to pixels
 * @returns The current pixel value equivalent of the rem input
 */
export const usePx = (rem: number): number => {
  const [fontSize, setFontSize] = useState(() => {
    if (typeof document !== 'undefined') {
      return getDocumentElementFontSize();
    }
    return 16; // Default fallback for SSR
  });

  const updateFontSize = useCallback(() => {
    setFontSize(getDocumentElementFontSize());
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    // Create a ResizeObserver to watch for font size changes on the document element
    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(document.documentElement);

    // Also listen for viewport changes that might affect font size
    const mediaQueryList = window.matchMedia('all');
    const handleMediaChange = () => {
      updateFontSize();
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleMediaChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleMediaChange);
    }

    return () => {
      resizeObserver.disconnect();
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleMediaChange);
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(handleMediaChange);
      }
    };
  }, []);

  return useMemo(() => rem * fontSize, [fontSize]);
};
