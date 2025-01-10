//
// Copyright 2025 DXOS.org
//

import { defineModule, eventKey, definePlugin, Events as AppEvents, contributes, lazy } from '@dxos/app-framework/next';
import { AttentionManager } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from './capabilities';
import { AttentionEvents } from './events';
import meta from './meta';

export const AttentionPlugin = definePlugin(meta, [
  defineModule({
    id: `${meta.id}/attention`,
    activationEvents: [eventKey(AppEvents.Startup)],
    triggeredEvents: [eventKey(AttentionEvents.AttentionReady)],
    activate: () => {
      const attention = new AttentionManager();
      setupDevtools(attention);
      return contributes(AttentionCapabilities.Attention, attention);
    },
  }),
  defineModule({
    id: `${meta.id}/react-context`,
    activationEvents: [eventKey(AppEvents.Startup)],
    activate: lazy(() => import('./react-context')),
  }),
  defineModule({
    id: `${meta.id}/keyboard`,
    activationEvents: [eventKey(AppEvents.GraphReady), eventKey(AttentionEvents.AttentionReady)],
    activate: lazy(() => import('./keyboard')),
  }),
]);

const setupDevtools = (attention: AttentionManager) => {
  (globalThis as any).composer ??= {};

  (globalThis as any).composer.attention = {
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
