//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { Testing as TestingType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { TestingMain } from './components';
import { isTesting, TestingPluginProvides } from './props';
import translations from './translations';

export const TestingPlugin = (): PluginDefinition<TestingPluginProvides> => ({
  meta: {
    id: 'dxos.org/plugin/testing',
  },
  provides: {
    translations,
    space: {
      types: [
        {
          id: 'create-Testing',
          testId: 'TestingPlugin.createStack',
          label: ['create Testing label', { ns: 'dxos.org/plugin/Testing' }],
          icon: Plus,
          Type: TestingType,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isTesting(datum[datum.length - 1])) {
            return TestingMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      TestingMain,
    },
  },
});
