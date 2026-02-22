//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';

export const soloInlinePadding =
  'pl-[calc(env(safe-area-inset-left)+.25rem)] pr-[calc(env(safe-area-inset-left)+.25rem)]';

const sidebarToggleStyles = 'block-[--rail-item] inline-[--rail-item] absolute bottom-2 z-[1] !bg-deckSurface lg:hidden';

export const fixedSidebarToggleStyles = mx(sidebarToggleStyles, 'left-2');

export const fixedComplementarySidebarToggleStyles = mx(sidebarToggleStyles, 'right-2');
