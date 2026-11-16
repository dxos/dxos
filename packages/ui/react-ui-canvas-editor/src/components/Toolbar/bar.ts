//
// Copyright 2026 DXOS.org
//

import { FLOATING_BAR, FLOATING_BAR_RULES } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/ui-theme';

/**
 * A floating `ActionToolbar`: as wide as its controls, or as its frame where that is narrower, so the frame's width
 * decides what collapses into the ⋮ menu.
 */
export const menuBarClasses = mx('w-max max-w-full', FLOATING_BAR, FLOATING_BAR_RULES);
