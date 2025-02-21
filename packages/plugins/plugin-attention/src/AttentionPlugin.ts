//
// Copyright 2025 DXOS.org
//

import { defineModule, definePlugin, Events, contributes, allOf } from '@dxos/app-framework';
import { AttentionManager, SelectionManager } from '@dxos/react-ui-attention';

import { AttentionCapabilities, Keyboard, ReactContext } from './capabilities';
import { AttentionEvents } from './events';
import { meta } from './meta';

export const AttentionPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/attention`,
      activatesOn: Events.Startup,
      activatesAfter: [AttentionEvents.AttentionReady],
      activate: () => {
        const attention = new AttentionManager();
        const selection = new SelectionManager();
        setupDevtools(attention);
        return [
          contributes(AttentionCapabilities.Attention, attention),
          contributes(AttentionCapabilities.Selection, selection),
        ];
      },
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/keyboard`,
      activatesOn: allOf(Events.AppGraphReady, AttentionEvents.AttentionReady),
      activate: Keyboard,
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
