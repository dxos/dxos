//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { type NavTreeCapabilities } from '#types';

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
