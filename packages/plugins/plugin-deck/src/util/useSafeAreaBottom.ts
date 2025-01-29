//
// Copyright 2025 DXOS.org
//

import { useLayoutEffect, useState } from 'react';

export const useSafeAreaBottom = () => {
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);
  useLayoutEffect(
    () =>
      setSafeAreaBottom(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom'))),
    [],
  );
  return safeAreaBottom;
};
