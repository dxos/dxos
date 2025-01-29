//
// Copyright 2025 DXOS.org
//

import { useLayoutEffect, useState } from 'react';

export const useHoistStatusbar = (breakpoint: string) => {
  const [safeAreaBottom, setSafeAreaBottom] = useState(Infinity);
  useLayoutEffect(
    () =>
      setSafeAreaBottom(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom'))),
    [],
  );
  return Number.isFinite(safeAreaBottom) && safeAreaBottom < 1 && breakpoint === 'desktop';
};
