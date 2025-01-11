//
// Copyright 2025 DXOS.org
//

import { defineModule, definePlugin, Events, contributes, lazy, allOf } from '@dxos/app-framework/next';
import { AttentionManager } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from './capabilities';
import { AttentionEvents } from './events';
import meta from './meta';

export const AttentionPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/attention`,
      activatesOn: Events.Startup,
      triggers: [AttentionEvents.AttentionReady],
      activate: () => {
        const attention = new AttentionManager();
        setupDevtools(attention);
        return contributes(AttentionCapabilities.Attention, attention);
      },
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: lazy(() => import('./react-context')),
    }),
    defineModule({
      id: `${meta.id}/module/keyboard`,
      activatesOn: allOf(Events.AppGraphReady, AttentionEvents.AttentionReady),
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
