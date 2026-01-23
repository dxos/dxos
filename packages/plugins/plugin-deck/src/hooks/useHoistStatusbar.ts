//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { useThemeContext } from '@dxos/react-ui';

import { meta } from '../meta';
import type { DeckSettingsProps, LayoutMode } from '../types';

export const useHoistStatusbar = (breakpoint: string, layoutMode?: LayoutMode): boolean => {
  const { safeAreaPadding } = useThemeContext();
  const enableStatusbar = useCapability(Common.Capability.SettingsStore).getStore<DeckSettingsProps>(meta.id)?.value
    .enableStatusbar;

  return useMemo(() => {
    return (
      breakpoint === 'desktop' &&
      layoutMode !== 'solo--fullscreen' &&
      !!enableStatusbar &&
      safeAreaPadding?.bottom === 0
    );
  }, [enableStatusbar, breakpoint, safeAreaPadding?.bottom, layoutMode]);
};
