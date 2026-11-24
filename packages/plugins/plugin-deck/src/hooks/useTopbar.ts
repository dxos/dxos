//
// Copyright 2026 DXOS.org
//

import * as Surface from '@dxos/app-framework/Surface';

import { DeckSurface } from '#types';

import { layoutAppliesTopbar } from '../util/layoutAppliesTopbar.ts';
import { useBreakpoints } from './useBreakpoints.ts';

/** Whether the layout reserves a topbar: wherever the platform asks for one, or a host fills the banner. */
export const useTopbar = (fullscreen?: boolean): boolean => {
  const breakpoint = useBreakpoints();
  const start = Surface.useContributions(DeckSurface.BannerStart);
  const end = Surface.useContributions(DeckSurface.BannerEnd);
  return !fullscreen && (start.length > 0 || end.length > 0 || layoutAppliesTopbar(breakpoint, fullscreen));
};
