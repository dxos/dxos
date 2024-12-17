//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { GridContainer } from './components';
import meta, { GRID_PLUGIN } from './meta';
import translations from './translations';
import { GridItemType, GridType } from './types';
import { GridAction, type GridPluginProvides } from './types';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GridType.typename]: {
            createObject: (props: { name?: string }) => createIntent(GridAction.Create, props),
            placeholder: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: 'ph--squares-four--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (grid: GridType) => loadObjectReferences(grid, (grid) => grid.items),
          },
          [GridItemType.typename]: {
            parse: (item: GridItemType, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.object?.id, label: (item.object as any).title, data: item.object };
                case 'object':
                  return item.object;
                case 'view-object':
                  return item;
              }
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: GridItemType) => [], // loadObjectReferences(item, (item) => [item.object])
          },
        },
      },
      translations,
      echo: {
        schema: [GridType],
        system: [GridItemType],
      },
      surface: {
        definitions: () =>
          createSurface({
            id: GRID_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: GridType } => data.subject instanceof GridType,
            component: ({ data }) => <GridContainer grid={data.subject} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(GridAction.Create, ({ name }) => ({
            data: { object: create(GridType, { name, items: [] }) },
          })),
      },
    },
  };
};
