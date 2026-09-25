//
// Copyright 2026 DXOS.org
//

import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';

/**
 * Which shell the chat surfaces are rendering into.
 *
 * Platform, not viewport: the affordances keyed to it (the online indicator, the thread's marker rail
 * and status pill) are dropped because the mobile app has no room and no pointer for them, not
 * because a window happens to be narrow — a narrowed desktop window keeps them all.
 *
 * The capability is optional so a harness that loads no deck plugin (storybook, tests) still renders,
 * taking the desktop treatment.
 *
 * Reads `DeckCapabilities.Platform` rather than `useLayout()` because `Layout.mode` is an open string
 * contract for whatever a layout plugin reports, while `Platform` is the typed, boot-fixed source this
 * hook actually needs.
 */
export const usePlatform = (): DeckCapabilities.Platform =>
  useOptionalCapability(DeckCapabilities.Platform) ?? 'desktop';
