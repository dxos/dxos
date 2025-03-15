//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { useThemeContext } from '@dxos/react-ui';

import { DECK_PLUGIN } from '../meta';
import type { DeckSettingsProps } from '../types';

export const useHoistStatusbar = (breakpoint: string) => {
  const enableStatusbar = useCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(DECK_PLUGIN)!
    .value.enableStatusbar;
  const { safeAreaPadding } = useThemeContext();
  return useMemo(() => {
    return breakpoint === 'desktop' && enableStatusbar && safeAreaPadding?.bottom === 0;
  }, [enableStatusbar, breakpoint, safeAreaPadding?.bottom]);
};
