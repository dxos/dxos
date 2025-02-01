//
// Copyright 2023 DXOS.org
//

import { useLayoutEffect } from 'react';

export const useResize = (
  handler: (event?: Event) => void,
  deps: Parameters<typeof useLayoutEffect>[1] = [handler],
) => {
  return useLayoutEffect(() => {
    window.visualViewport?.addEventListener('resize', handler);
    handler();
    return () => window.visualViewport?.removeEventListener('resize', handler);
  }, deps);
};
