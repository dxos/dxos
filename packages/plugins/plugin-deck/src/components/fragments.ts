//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';

export const soloInlinePadding =
  'pis-[calc(env(safe-area-inset-left)+.25rem)] pie-[calc(env(safe-area-inset-left)+.25rem)]';

const sidebarToggleStyles = 'bs-[--rail-item] is-[--rail-item] absolute block-end-2 z-[1] !bg-deckSurface lg:hidden';

export const fixedSidebarToggleStyles = mx(sidebarToggleStyles, 'inline-start-2');

export const fixedComplementarySidebarToggleStyles = mx(sidebarToggleStyles, 'inline-end-2');
