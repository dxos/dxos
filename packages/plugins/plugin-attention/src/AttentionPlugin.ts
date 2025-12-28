//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capability, Events, Plugin } from '@dxos/app-framework';
import { AttentionManager, SelectionManager } from '@dxos/react-ui-attention';

import { AttentionCapabilities, IntentResolver, Keyboard, ReactContext } from './capabilities';
import { AttentionEvents } from './events';
import { meta } from './meta';

export const AttentionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'attention',
    activatesOn: Events.Startup,
    activatesAfter: [AttentionEvents.AttentionReady],
    activate: () => {
      const attention = new AttentionManager();
      const selection = new SelectionManager();
      setupDevtools(attention);
      return [
        Capability.contributes(AttentionCapabilities.Attention, attention),
        Capability.contributes(AttentionCapabilities.Selection, selection),
      ];
    },
  }),
  Plugin.addModule({
    id: 'react-context',
    activatesOn: Events.Startup,
    activate: ReactContext,
  }),
  Plugin.addModule({
    id: 'keyboard',
    activatesOn: ActivationEvent.allOf(Events.AppGraphReady, AttentionEvents.AttentionReady),
    activate: Keyboard,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
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
      return attention.current;
    },
    get currentSpace() {
      for (const id of attention.current) {
        const [spaceId, objectId] = id.split(':');
        if (spaceId && objectId && spaceId.length === 33) {
          return spaceId;
        }
      }
    },
  };
};
