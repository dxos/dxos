//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { useThemeContext } from '@dxos/react-ui';

import { DECK_PLUGIN } from '../meta';
import type { DeckSettingsProps } from '../types';

export const useHoistStatusbar = (breakpoint: string) => {
  const enableIdeStyleStatusbar = useCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(DECK_PLUGIN)!
    .value.enableIdeStyleStatusbar;
  const { safeAreaPadding } = useThemeContext();
  return useMemo(() => {
    return breakpoint === 'desktop' && enableIdeStyleStatusbar && safeAreaPadding?.bottom === 0;
  }, [enableIdeStyleStatusbar, breakpoint, safeAreaPadding?.bottom]);
};
