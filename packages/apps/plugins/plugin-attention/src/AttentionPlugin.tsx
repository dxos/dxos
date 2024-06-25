//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { type PropsWithChildren } from 'react';

import {
  type Plugin,
  type Attention,
  type GraphProvides,
  resolvePlugin,
  parseGraphPlugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { AttentionProvider } from '@dxos/react-ui-attention';

import meta from './meta';

type AttentionProvides = {
  attention: Attention;
};

export type AttentionPluginProvides = AttentionProvides;

export const parseAttentionPlugin = (plugin?: Plugin) =>
  typeof (plugin?.provides as any).attention === 'object' ? (plugin as Plugin<AttentionPluginProvides>) : undefined;

export const AttentionPlugin = (): PluginDefinition<AttentionPluginProvides> => {
  const attention = create<Attention>({
    attended: new Set(),
  });

  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins: any) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      effect(() => {
        const id = Array.from(attention.attended ?? [])[0];
        const path = id && graphPlugin?.provides.graph.getPath({ target: id });
        if (path) {
          Keyboard.singleton.setCurrentContext(path.join('/'));
        }
      });
    },
    provides: {
      attention,
      context: (props: PropsWithChildren) => (
        <AttentionProvider
          attended={attention.attended}
          onChangeAttend={(nextAttended) => {
            attention.attended = nextAttended;

            // TODO(Zan): Workout why this was in deck plugin. It didn't seem to work?
            // if (layout.values.scrollIntoView && nextAttended.has(layout.values.scrollIntoView)) {
            //   layout.values.scrollIntoView = undefined;
            // }
          }}
        >
          {props.children}
        </AttentionProvider>
      ),
    },
  };
};
