//
// Copyright 2023 DXOS.org
//

import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { KanbanMain } from './components';
import { isKanban } from './props';
import translations from './translations';

export const KanbanPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos.org/plugin/kanban',
  },
  provides: {
    translations,
    component: (datum, role) => {
      switch (role) {
        case 'main':
          // TODO(burdon): Why array?
          if (Array.isArray(datum) && isKanban(datum[0])) {
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
