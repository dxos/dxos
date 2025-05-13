//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { isEchoObject } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TODO(burdon): Factor out/make generic?
    createExtension({
      id: `${meta.id}/schema`,
      filter: (node): node is Node<TableType> => isInstanceOf(TableType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'schema'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'schema',
          properties: {
            label: ['companion schema label', { ns: meta.id }],
            icon: 'ph--database--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
    // TODO(wittjosiah): Factor out/make generic?
    createExtension({
      id: `${meta.id}/selected-objects`,
      filter: (node): node is Node<TableType> => {
        if (!node.data || !isEchoObject(node.data)) {
          return false;
        }

        const subject = node.data;
        // TODO(ZaymonFC): Unify the path of view between table and kanban.
        const hasValidView = subject.view?.target instanceof ViewType;
        const hasValidCardView = subject.cardView?.target instanceof ViewType;

        return hasValidView || hasValidCardView;
      },
      connector: ({ node }) => [
        {
          id: [node.id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'selected-objects',
          properties: {
            label: ['companion selected objects label', { ns: meta.id }],
            icon: 'ph--tree-view--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
  ]);
