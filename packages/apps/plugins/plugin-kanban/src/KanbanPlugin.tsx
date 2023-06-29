//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Kanban } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban } from './props';
import translations from './translations';

export const KanbanPlugin = (): PluginDefinition<TranslationsProvides> => ({
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
          label: ['create kanban label', { ns: 'dxos.org:plugin/kanban' }],
          icon: Plus,
          Type: Kanban,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (isKanban(datum)) {
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
