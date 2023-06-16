//
// Copyright 2023 DXOS.org
//

import { Stack as StackProto } from '@braneframe/types';
import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { StackMain } from '../components';
import { stackPluginTranslations } from '../translations';

// todo(thure): Do we really need to add `react-client` as a dependency just to have `isTypedObject`?
export const isStack = (datum: any): datum is StackProto =>
  '__typename' in datum && StackProto.type.name === datum.__typename;

export const StackPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:StackPlugin',
  },
  provides: {
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (isStack(datum)) {
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
    translations: [stackPluginTranslations],
  },
});
