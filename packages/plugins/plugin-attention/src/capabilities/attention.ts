//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Attention, ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const attention = new Attention.AttentionManager(registry);
    const viewState = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
    setupDevtools(attention);
    return [
      Capability.contribute(AttentionCapabilities.Attention, attention),
      Capability.contribute(AttentionCapabilities.ViewState, viewState),
    ];
  }),
);

const setupDevtools = (attention: Attention.AttentionManager) => {
  (globalThis as any).composer ??= {};

  (globalThis as any).composer.attention = {
    get manager() {
      return attention;
    },
    get attended() {
      return attention.getCurrent();
    },
    get currentSpace() {
      for (const id of attention.getCurrent()) {
        const segments = id.split('/');
        if (segments.length > 1 && segments[1].length === 33) {
          return segments[1];
        }
      }
    },
  };
};
