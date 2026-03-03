//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';

export const soloInlinePadding =
  'ps-[calc(env(safe-area-inset-left)+.25rem)] pe-[calc(env(safe-area-inset-left)+.25rem)]';

const sidebarToggleStyles = 'h-(--dx-rail-item) w-(--dx-rail-item) absolute bottom-2 z-[1] !bg-deck-surface lg:hidden';

export const fixedSidebarToggleStyles = mx(sidebarToggleStyles, 'left-2');

export const fixedComplementarySidebarToggleStyles = mx(sidebarToggleStyles, 'right-2');
