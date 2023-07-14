//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { Kanban as KanbanType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban, KanbanPluginProvides } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => ({
  meta: {
    // TODO(burdon): Make id consistent with other plugins.
    id: 'dxos.org/plugin/kanban',
  },
  provides: {
    translations,
    space: {
      types: [
        {
          id: 'create-kanban',
          testId: 'kanbanPlugin.createStack',
          label: ['create kanban label', { ns: 'dxos.org/plugin/kanban' }],
          icon: Plus,
          Type: KanbanType,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isKanban(datum[datum.length - 1])) {
            return KanbanMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      KanbanMain,
    },
  },
});
