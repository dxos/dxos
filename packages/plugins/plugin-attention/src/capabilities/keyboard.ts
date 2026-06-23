//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Node } from '@dxos/plugin-graph';
import { Keyboard } from '@dxos/keyboard';

import { AttentionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const attention = yield* Capability.get(AttentionCapabilities.Attention);

    const unsubscribe = attention.subscribeCurrent((current) => {
      const id = current[0];
      // Nested under graph root so plank context inherits root-level bindings (e.g. global search).
      Keyboard.singleton.setCurrentContext(id ? `${Node.RootId}/${id}` : Node.RootId);
    });

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => unsubscribe()));
  }),
);
