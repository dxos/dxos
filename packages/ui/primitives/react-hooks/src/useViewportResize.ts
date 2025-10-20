//
// Copyright 2025 DXOS.org
//

import { useLayoutEffect, useMemo } from 'react';

export const useViewportResize = (
  handler: (event?: Event) => void,
  deps: Parameters<typeof useLayoutEffect>[1] = [],
  delay: number = 800,
) => {
  const debouncedHandler = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (event?: Event) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handler(event);
      }, delay);
    };
  }, [handler, delay]);

  return useLayoutEffect(() => {
    window.visualViewport?.addEventListener('resize', debouncedHandler);
    debouncedHandler();
    return () => window.visualViewport?.removeEventListener('resize', debouncedHandler);
  }, [debouncedHandler, ...deps]);
};
