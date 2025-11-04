//
// Copyright 2025 DXOS.org
//

import { type LayoutMode } from '../types';

export const layoutAppliesTopbar = (breakpoint: string, layoutMode?: LayoutMode) =>
  document.body.getAttribute('data-platform') === 'win' &&
  breakpoint === 'desktop' &&
  layoutMode !== 'solo--fullscreen';
