//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Option from 'effect/Option';

import { Common, Capability } from '@dxos/app-framework';
import { Keyboard } from '@dxos/keyboard';
import { Graph } from '@dxos/plugin-graph';

import { AttentionCapabilities } from '../../types';

export default Capability.makeModule((context) => {
  const { graph } = context.getCapability(Common.Capability.AppGraph);
  const attention = context.getCapability(AttentionCapabilities.Attention);

  const unsubscribe = effect(() => {
    const id = Array.from(attention.current)[0];
    const path = id && Graph.getPath(graph, { target: id }).pipe(Option.getOrNull);
    if (path) {
      Keyboard.singleton.setCurrentContext(path.join('/'));
    }
  });

  return Capability.contributes(Common.Capability.Null, null, () => unsubscribe());
});
