//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createSurface, type PluginDefinition } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { type Space, isSpace } from '@dxos/react-client/echo';

import CallsContainer from './components/CallsContainer';
import meta, { CALLS_PLUGIN } from './meta';
import translations from './translations';
import { type CallsPluginProvides } from './types';

type Call = {
  type: string;
  space: Space;
};

const isCall = (data: any): data is Call => data.type === `${CALLS_PLUGIN}/space` && isSpace(data.space);

export const CallsPlugin = (): PluginDefinition<CallsPluginProvides> => {
  return {
    meta,
    provides: {
      graph: {
        builder: (plugins) => {
          return [
            // Space calls nodes.
            createExtension({
              id: `${CALLS_PLUGIN}/space`,
              filter: (node): node is Node<Space> => isSpace(node.data),
              connector: ({ node }) => {
                const space = node.data;
                return [
                  {
                    id: `${space.id}-calls`,
                    type: `${CALLS_PLUGIN}/space`,
                    data: { space, type: `${CALLS_PLUGIN}/space` },
                    properties: {
                      label: ['calls label', { ns: CALLS_PLUGIN }],
                      icon: 'ph--phone-call--regular',
                    },
                  },
                ];
              },
            }),
          ];
        },
      },
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: meta.id,
            role: 'article',
            filter: (data): data is { object: Call } => isCall(data.object),
            component: ({ data, role }) => <CallsContainer space={data.object.space} role={role} />,
          }),
      },
    },
  };
};
