//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';

import { Stack } from '@braneframe/types';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain, StackSectionOverlay } from './components';
import { isStack, StackPluginProvides, StackProvides } from './props';
import { stackSectionChoosers, stackSectionCreators } from './stores';
import translations from './translations';

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
        case 'dragoverlay':
          if (datum && typeof datum === 'object' && 'object' in datum) {
            return StackSectionOverlay;
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
