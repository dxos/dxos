//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { type PropsWithChildren } from 'react';

import {
  type Plugin,
  type GraphProvides,
  resolvePlugin,
  parseGraphPlugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { Keyboard } from '@dxos/keyboard';
import { type Attention, AttentionManager, RootAttentionProvider } from '@dxos/react-ui-attention';

import meta from './meta';

type AttentionProvides = {
  attention: {
    attended: Readonly<string[]>;
    getAttention: (path: string[]) => Attention;
  };
};

export type AttentionPluginProvides = AttentionProvides;

export const parseAttentionPlugin = (plugin?: Plugin) =>
  typeof (plugin?.provides as any).attention === 'object' ? (plugin as Plugin<AttentionPluginProvides>) : undefined;

export const AttentionPlugin = (): PluginDefinition<AttentionPluginProvides> => {
  const attention = new AttentionManager();
  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins: any) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      effect(() => {
        const id = Array.from(attention.current)[0];
        const path = id && graphPlugin?.provides.graph.getPath({ target: id });
        if (path) {
          Keyboard.singleton.setCurrentContext(path.join('/'));
        }
      });

      setupDevtools(attention);
    },
    provides: {
      attention: {
        get attended() {
          return attention.current;
        },
        getAttention: attention.get,
      },
      context: ({ children }: PropsWithChildren) => (
        <RootAttentionProvider
          attention={attention}
          onChange={(nextAttended) => {
            // TODO(Zan): Workout why this was in deck plugin. It didn't seem to work?
            // if (layout.values.scrollIntoView && nextAttended.has(layout.values.scrollIntoView)) {
            //   layout.values.scrollIntoView = undefined;
            // }
          }}
        >
          {children}
        </RootAttentionProvider>
      ),
    },
  };
};

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
