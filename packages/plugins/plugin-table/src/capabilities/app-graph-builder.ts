//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { createExtension } from '@dxos/plugin-graph';

import { TABLE_PLUGIN } from '../meta';

export const AppGraphBuilder = () =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TABLE_PLUGIN}/properties-for-subject`,
      resolver: ({ id }) => {
        if (!id.endsWith('~properties')) {
          return;
        }

        return {
          id,
          type: 'object-properties',
          data: null,
          properties: {
            icon: 'ph--list--regular',
            label: ['Properties', { ns: TABLE_PLUGIN }],
          },
        };
      },
    }),
  ]);
