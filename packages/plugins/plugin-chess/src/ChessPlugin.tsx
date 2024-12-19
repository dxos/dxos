//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import ChessContainer from './components/ChessContainer';
import meta, { CHESS_PLUGIN } from './meta';
import translations from './translations';
import { ChessAction, type ChessPluginProvides, GameType, isObject } from './types';

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GameType.typename]: {
            createObject: (props: { name?: string }) => createIntent(ChessAction.Create, props),
            placeholder: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: 'ph--shield-chevron--regular',
          },
        },
      },
      echo: {
        schema: [GameType],
      },
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: CHESS_PLUGIN,
            role: ['article', 'section'],
            filter: (data): data is { subject: GameType } => isObject(data.subject),
            component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(ChessAction.Create, ({ name }) => ({
            data: {
              object: create(GameType, { name }),
            },
          })),
      },
    },
  };
};
