//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionManager, ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import { Keyboard, OperationHandler, ReactContext } from '#capabilities';
import { meta } from '#meta';
import { AttentionEvents } from '#types';
import { AttentionCapabilities } from '#types';

export const AttentionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.addModule({
    id: 'attention',
    activatesOn: ActivationEvents.Startup,
    firesAfterActivation: [AttentionEvents.AttentionReady],
    activate: () =>
      Effect.gen(function* () {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const attention = new AttentionManager(registry);
        const viewState = new ViewState.ViewStateManager({ registry, backends: createDefaultBackends(registry) });
        setupDevtools(attention);
        return [
          Capability.contributes(AttentionCapabilities.Attention, attention),
          Capability.contributes(AttentionCapabilities.ViewState, viewState),
        ];
      }),
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: ReactContext,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.AppGraphReady, AttentionEvents.AttentionReady),
    activate: Keyboard,
  }),
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
