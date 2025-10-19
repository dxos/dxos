//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Option from 'effect/Option';

import { Capabilities as AppCapabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Keyboard } from '@dxos/keyboard';

import { AttentionCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const { graph } = context.getCapability(AppCapabilities.AppGraph);
  const attention = context.getCapability(AttentionCapabilities.Attention);

  const unsubscribe = effect(() => {
    const id = Array.from(attention.current)[0];
    const path = id && graph.getPath({ target: id }).pipe(Option.getOrNull);
    if (path) {
      Keyboard.singleton.setCurrentContext(path.join('/'));
    }
  });

  return contributes(AppCapabilities.Null, null, () => unsubscribe());
};
