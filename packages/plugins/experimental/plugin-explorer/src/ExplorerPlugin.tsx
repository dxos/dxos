//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/react-client/echo';

import { ExplorerArticle } from './components';
import meta, { EXPLORER_PLUGIN } from './meta';
import translations from './translations';
import { ViewType } from './types';
import { ExplorerAction, type ExplorerPluginProvides } from './types';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ViewType.typename]: {
            createObject: (props: { name?: string }) => createIntent(ExplorerAction.Create, props),
            placeholder: ['object title placeholder', { ns: EXPLORER_PLUGIN }],
            icon: 'ph--graph--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [ViewType],
      },
      surface: {
        definitions: () =>
          createSurface({
            id: `${EXPLORER_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: ViewType } => data.subject instanceof ViewType,
            component: ({ data }) => <ExplorerArticle view={data.subject} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(ExplorerAction.Create, ({ name }) => ({
            data: { object: create(ViewType, { name, type: '' }) },
          })),
      },
    },
  };
};
