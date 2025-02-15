//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';

import { DECK_PLUGIN } from '../meta';
import type { DeckSettingsProps } from '../types';

export const useHoistStatusbar = (breakpoint: string) => {
  const enableIdeStyleStatusbar = useCapability(Capabilities.SettingsStore).getStore<DeckSettingsProps>(DECK_PLUGIN)!
    .value.enableIdeStyleStatusbar;
  return useMemo(() => {
    return (
      breakpoint === 'desktop' &&
      enableIdeStyleStatusbar &&
      // NOTE(thure): this last predicate depends on a head script that measures `env(safe-area-bottom)` on resize;
      // see that of composer-app for an example.
      document.body.getAttribute('data-safe-area-bottom') === '0'
    );
  }, [enableIdeStyleStatusbar, breakpoint]);
};
