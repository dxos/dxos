//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { type NavTreeCapabilities } from '#types';

/**
 * Drops the rail from the layout's sizes on the document, where the deck reads them: the sidebar
 * narrows to the L1 panel's width, and a collapsed sidebar leaves the screen. Set at startup, before
 * the shell renders, so the sidebar never paints at the railed width and animates to this one.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ rail = true }: NavTreeCapabilities.NavTreePluginOptions = {}) {
    if (rail) {
      return [];
    }

    const { style } = document.documentElement;
    const panelSize = getComputedStyle(document.documentElement).getPropertyValue('--dx-l1-size');
    style.setProperty('--dx-nav-sidebar-size', panelSize);
    style.setProperty('--dx-l0-size', '0px');
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        style.removeProperty('--dx-nav-sidebar-size');
        style.removeProperty('--dx-l0-size');
      }),
    );
    return [];
  }),
);
