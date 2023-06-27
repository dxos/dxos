//
// Copyright 2023 DXOS.org
//

import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban } from './props';
import translations from './translations';

export const KanbanPlugin: PluginDefinition = definePlugin({
  meta: {
    // TODO(burdon): Make id consistent with other plugins.
    id: 'dxos.org/plugin/kanban',
  },
  provides: {
    translations,
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
