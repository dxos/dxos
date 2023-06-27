//
// Copyright 2023 DXOS.org
//

import { TranslationsProvides } from '@braneframe/plugin-theme';
import { PluginDefinition } from '@dxos/react-surface';

import { StackMain } from './components';
import { isStack } from './props';
import translations from './translations';

export const StackPlugin = (): PluginDefinition<TranslationsProvides> => ({
  meta: {
    id: 'dxos:stack',
  },
  provides: {
    translations,
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isStack(datum[0])) {
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
