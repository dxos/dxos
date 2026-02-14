//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Keyboard } from '@dxos/keyboard';
import { Graph } from '@dxos/plugin-graph';

import { AttentionCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);

    const unsubscribe = attention.subscribeCurrent((current) => {
      const id = current[0];
      const path = id && Graph.getPath(graph, { target: id }).pipe(Option.getOrNull);
      if (path) {
        Keyboard.singleton.setCurrentContext(path.join('/'));
      }
    });

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => unsubscribe()));
  }),
);
