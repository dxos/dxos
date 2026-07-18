//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AttentionManager, ViewStateManager, createDefaultBackends } from '@dxos/react-ui-attention';

import { Keyboard, OperationHandler, ReactContext } from '#capabilities';
import { meta } from '#meta';
import { AttentionCapabilities } from '#types';

export const AttentionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  Plugin.addModule({
    id: 'attention',
    requires: [Capabilities.AtomRegistry],
    provides: [AttentionCapabilities.Attention, AttentionCapabilities.ViewState],
    activate: () =>
      Effect.gen(function* () {
        const registry = yield* Capabilities.AtomRegistry;
        const attention = new AttentionManager(registry);
        const viewState = new ViewStateManager({ registry, backends: createDefaultBackends(registry) });
        setupDevtools(attention);
        return [
          Capability.provide(AttentionCapabilities.Attention, attention),
          Capability.provide(AttentionCapabilities.ViewState, viewState),
        ];
      }),
  }),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(Keyboard),
  Plugin.make,
);

const setupDevtools = (attention: AttentionManager) => {
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

export default AttentionPlugin;
