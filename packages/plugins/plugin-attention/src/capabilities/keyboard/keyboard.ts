//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Keyboard } from '@dxos/keyboard';
import { Graph } from '@dxos/plugin-graph';

import { AttentionCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* Capability.get(Common.Capability.AppGraph);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);

    const unsubscribe = effect(() => {
      const id = Array.from(attention.current)[0];
      const path = id && Graph.getPath(graph, { target: id }).pipe(Option.getOrNull);
      if (path) {
        Keyboard.singleton.setCurrentContext(path.join('/'));
      }
    });

    return Capability.contributes(Common.Capability.Null, null, () => Effect.sync(() => unsubscribe()));
  }),
);
