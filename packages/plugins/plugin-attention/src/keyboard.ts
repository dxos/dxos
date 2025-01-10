//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities as AppCapabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { Keyboard } from '@dxos/keyboard';

import { AttentionCapabilities } from './capabilities';

export default (context: PluginsContext) => {
  const { graph } = context.requestCapability(AppCapabilities.AppGraph);
  const attention = context.requestCapability(AttentionCapabilities.Attention);

  const unsubscribe = effect(() => {
    const id = Array.from(attention.current)[0];
    const path = id && graph.getPath({ target: id });
    if (path) {
      Keyboard.singleton.setCurrentContext(path.join('/'));
    }
  });

  return contributes(AppCapabilities.Null, null, () => unsubscribe());
};
