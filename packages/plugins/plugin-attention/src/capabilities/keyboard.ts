//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { nestHotkeyScope, setHotkeyScope } from '@dxos/react-focus/store';

import { AttentionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const attention = yield* AttentionCapabilities.Attention;

    const unsubscribe = attention.subscribeCurrent((current) => {
      const id = current[0];
      // Nested under the graph root so a plank's scope also activates root-level bindings
      // (e.g. global search).
      setHotkeyScope(nestHotkeyScope(id));
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
    return [];
  }),
);
