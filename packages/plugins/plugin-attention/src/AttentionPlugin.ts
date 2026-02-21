//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionManager, SelectionManager } from '@dxos/react-ui-attention';

import { Keyboard, OperationResolver, ReactContext } from './capabilities';
import { meta } from './meta';
import { AttentionEvents } from './types';
import { AttentionCapabilities } from './types';

export const AttentionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.addModule({
    id: 'attention',
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [AttentionEvents.AttentionReady],
    activate: () =>
      Effect.gen(function* () {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const attention = new AttentionManager(registry);
        const selection = new SelectionManager(registry);
        setupDevtools(attention);
        return [
          Capability.contributes(AttentionCapabilities.Attention, attention),
          Capability.contributes(AttentionCapabilities.Selection, selection),
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
        const [spaceId, objectId] = id.split(':');
        if (spaceId && objectId && spaceId.length === 33) {
          return spaceId;
        }
      }
    },
  };
};
