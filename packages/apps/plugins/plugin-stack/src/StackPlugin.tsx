//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { Stack } from '@braneframe/types';
import { createStore } from '@dxos/observable-object';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain } from './components';
import { isStack, StackPluginProvides, StackProvides, StackSectionChooser, StackSectionCreator } from './props';
import translations from './translations';

export const stackSectionCreators = createStore<StackSectionCreator[]>([]);
export const stackSectionChoosers = createStore<StackSectionChooser[]>([]);

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => ({
  meta: {
    id: 'dxos:stack',
  },
  ready: async (plugins) => {
    return plugins.forEach((plugin) => {
      if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
        stackSectionCreators.splice(0, 0, ...(plugin as Plugin<StackProvides>).provides!.stack!.creators!);
      }
      if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.choosers)) {
        stackSectionChoosers.splice(0, 0, ...(plugin as Plugin<StackProvides>).provides!.stack!.choosers!);
      }
    });
  },
  provides: {
    translations,
    space: {
      types: [
        {
          id: 'create-stack',
          testId: 'stackPlugin.createStack',
          label: ['create stack label', { ns: 'dxos:stack' }],
          icon: (props) => <Plus {...props} />,
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
    stackSectionCreators,
    stackSectionChoosers,
  },
});
