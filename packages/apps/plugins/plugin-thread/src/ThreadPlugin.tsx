//
// Copyright 2023 DXOS.org
//

// import { Plus } from '@phosphor-icons/react';

// import { Thread as ThreadType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { ThreadMain } from './components';
import { isThread, ThreadPluginProvides } from './props';
import translations from './translations';

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => ({
  meta: {
    // TODO(burdon): Make id consistent with other plugins.
    id: 'dxos.org/plugin/thread',
  },
  provides: {
    translations,
    // TODO(wittjosiah): Migrate to graph plugin.
    // space: {
    //   types: [
    //     {
    //       id: 'create-thread',
    //       testId: 'threadPlugin.createStack',
    //       label: ['create thread label', { ns: 'dxos.org/plugin/thread' }],
    //       icon: Plus,
    //       Type: ThreadType,
    //     },
    //   ],
    // },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isThread(datum[datum.length - 1])) {
            return ThreadMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      ThreadMain,
    },
  },
});
