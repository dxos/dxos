//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { Stack } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { StackMain } from './components';
import { isStack, StackPluginProvides } from './props';
import translations from './translations';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => ({
  meta: {
    id: 'dxos:stack',
  },
  provides: {
    translations,
    space: {
      types: [
        {
          id: 'create-stack',
          testId: 'stackPlugin.createStack',
          label: ['create stack label', { ns: 'dxos:stack' }],
          icon: Plus,
          Type: Stack,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isStack(datum[datum.length - 1])) {
            return StackMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      StackMain,
    },
  },
});
