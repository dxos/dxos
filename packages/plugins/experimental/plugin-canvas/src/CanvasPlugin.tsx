//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { emptyGraph } from '@dxos/graph';
import { create } from '@dxos/live-object';

import { CanvasContainer } from './components';
import meta, { CANVAS_PLUGIN } from './meta';
import translations from './translations';
import { CanvasAction, type CanvasPluginProvides, CanvasBoardType } from './types';

export const CanvasPlugin = (): PluginDefinition<CanvasPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [CanvasBoardType.typename]: {
            createObject: (props: { name?: string }) => createIntent(CanvasAction.Create, props),
            placeholder: ['canvas title placeholder', { ns: CANVAS_PLUGIN }],
            icon: 'ph--infinity--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [CanvasBoardType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: CANVAS_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: CanvasBoardType } => data.subject instanceof CanvasBoardType,
            component: ({ data }) => <CanvasContainer canvas={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () =>
          createResolver(CanvasAction.Create, ({ name }) => ({
            data: {
              object: create(CanvasBoardType, {
                name,
                shapes: emptyGraph,
                // TODO(burdon): Specialize for compute graph plugin.
                // data: makeRef(create(ComputeGraph, { graph: emptyGraph })),
              }),
            },
          })),
      },
    },
  };
};
