//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAtomCapability } from '@dxos/app-framework/react';
import { useThemeContext } from '@dxos/react-ui';

import { DeckCapabilities, type LayoutMode } from '../types';

export const useHoistStatusbar = (breakpoint: string, layoutMode?: LayoutMode): boolean => {
  const { safeAreaPadding } = useThemeContext();
  const enableStatusbar = useAtomCapability(DeckCapabilities.Settings).enableStatusbar;

  return useMemo(() => {
    return (
      breakpoint === 'desktop' &&
      layoutMode !== 'solo--fullscreen' &&
      !!enableStatusbar &&
      safeAreaPadding?.bottom === 0
    );
  }, [enableStatusbar, breakpoint, safeAreaPadding?.bottom, layoutMode]);
};
