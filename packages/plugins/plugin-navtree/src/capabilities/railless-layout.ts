//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ReadOnly from '@dxos/app-toolkit/ReadOnly';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const readOnly = yield* ReadOnly.atom;
    const { style } = document.documentElement;
    const apply = (railless: boolean) => {
      if (railless) {
        const panelSize = getComputedStyle(document.documentElement).getPropertyValue('--dx-l1-size');
        style.setProperty('--dx-nav-sidebar-size', panelSize);
        style.setProperty('--dx-l0-size', '0px');
      } else {
        style.removeProperty('--dx-nav-sidebar-size');
        style.removeProperty('--dx-l0-size');
      }
    };
    const unsubscribe = registry.subscribe(readOnly, apply, { immediate: true });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        apply(false);
      }),
    );
    return [];
  }),
);
