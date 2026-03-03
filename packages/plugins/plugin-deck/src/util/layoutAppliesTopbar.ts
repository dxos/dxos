//
// Copyright 2025 DXOS.org
//

import { type LayoutMode } from '../types';

export const layoutAppliesTopbar = (breakpoint: string, layoutMode?: LayoutMode) => {
  return (
    document.body.getAttribute('data-platform') === 'windows' &&
    breakpoint === 'desktop' &&
    layoutMode !== 'solo--fullscreen'
  );
};
