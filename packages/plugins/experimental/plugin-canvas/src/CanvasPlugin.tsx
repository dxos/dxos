//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create, RefArray } from '@dxos/live-object';

import { CanvasContainer } from './components';
import meta, { CANVAS_PLUGIN } from './meta';
import translations from './translations';
import { type CanvasPluginProvides, CanvasAction, CanvasItemType, CanvasType } from './types';

export const CanvasPlugin = (): PluginDefinition<CanvasPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [CanvasType.typename]: {
            createObject: (props: { name?: string }) => createIntent(CanvasAction.Create, props),
            placeholder: ['grid title placeholder', { ns: CANVAS_PLUGIN }],
            icon: 'ph--squares-four--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (canvas: CanvasType) => await RefArray.loadAll(canvas.items ?? []),
          },
          [CanvasItemType.typename]: {
            parse: (item: CanvasItemType, type: string) => {
              switch (type) {
                case 'node':
                  return {
                    id: item.object.target?.id,
                    label: (item.object.target as any).title,
                    data: item.object.target,
                  };
                case 'object':
                  return item.object.target;
                case 'view-object':
                  return item;
              }
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: CanvasItemType) => [], // loadObjectReferences(item, (item) => [item.object])
          },
        },
      },
      translations,
      echo: {
        schema: [CanvasType],
        system: [CanvasItemType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: CANVAS_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: CanvasType } => data.subject instanceof CanvasType,
            component: ({ data }) => <CanvasContainer canvas={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () =>
          createResolver(CanvasAction.Create, ({ name }) => ({
            data: { object: create(CanvasType, { name, items: [] }) },
          })),
      },
    },
  };
};
