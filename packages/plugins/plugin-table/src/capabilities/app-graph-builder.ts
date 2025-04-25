//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { TableType } from '@dxos/react-ui-table';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TOOD(burdon): Factor out: make generic?
    createExtension({
      id: `${meta.id}/schema`,
      filter: (node): node is Node<TableType> => isInstanceOf(TableType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'schema'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['companion schema label', { ns: meta.id }],
            icon: 'ph--database--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
  ]);
