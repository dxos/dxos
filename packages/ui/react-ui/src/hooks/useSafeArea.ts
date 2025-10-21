//
// Copyright 2025 DXOS.org
//

import { useCallback, useState } from 'react';

import { useViewportResize } from '@dxos/react-hooks';

export type SafeAreaPadding = Record<'top' | 'right' | 'bottom' | 'left', number>;

export const initialSafeArea = { top: NaN, right: NaN, bottom: NaN, left: NaN };

export const useSafeArea = (): SafeAreaPadding => {
  const [padding, setPadding] = useState<SafeAreaPadding>(initialSafeArea);
  const handleResize = useCallback(() => {
    setPadding({
      top: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')),
      right: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right')),
      bottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')),
      left: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left')),
    });
  }, []);

  useViewportResize(handleResize);
  return padding;
};
