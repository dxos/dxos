//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { type Space, isSpace } from '@dxos/react-client/echo';

import CallsContainer from './components/CallsContainer';
import meta, { CALLS_PLUGIN } from './meta';
import translations from './translations';
import { type CallsPluginProvides } from './types';

export const CallsPlugin = (): PluginDefinition<CallsPluginProvides> => {
  return {
    meta,
    provides: {
      graph: {
        builder: (plugins) => {
          return [
            // Space calls nodes.
            createExtension({
              id: 'dxos.org/plugin/debug/spaces',
              filter: (node): node is Node<Space> => isSpace(node.data),
              connector: ({ node }) => {
                const space = node.data;
                return [
                  {
                    id: `${space.id}-calls`,
                    type: `${CALLS_PLUGIN}/space`,
                    data: { space },
                    properties: {
                      label: ['debug label', { ns: CALLS_PLUGIN }],
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
        component: ({ data, role }) => {
          switch (role) {
            case 'article':
            case 'section': {
              const primary: any = data.active ?? data.object;
              if ('space' in primary && isSpace(primary.space)) {
                return <CallsContainer space={primary.space} role={role} />;
              }
              return null;
            }
            default:
              return null;
          }
        },
      },
    },
  };
};
