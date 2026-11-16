//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';

import { DeckCapabilities } from '#types';

import { layoutAppliesTopbar } from '../util/layoutAppliesTopbar.ts';
import { useBreakpoints } from './useBreakpoints.ts';

/** Whether the layout reserves a topbar for the current width and fullscreen state. */
export const useTopbar = (fullscreen?: boolean): boolean => {
  const breakpoint = useBreakpoints();
  const banner = Hooks.useCapability(DeckCapabilities.Banner);
  return layoutAppliesTopbar(breakpoint, fullscreen, banner);
};
