//
// Copyright 2024 DXOS.org
//

import { Asterisk } from '@phosphor-icons/react';

import {
  definePlugin,
  type SurfaceProvides,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';

export const PLUGIN_ID = 'dxos.org/plugin/template';

export type TemplatePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides & {};

export default definePlugin<TemplatePluginProvides>({
  meta: {
    id: PLUGIN_ID,
    name: '',
    iconComponent: Asterisk,
  },
  provides: {
    surface: {
      component: ({ data, role }) => null,
    },
    intent: {
      resolver: (intent) => {},
    },
    graph: {
      builder: ({ parent, plugins }) => {},
    },
    translations: [
      {
        'en-US': {
          [PLUGIN_ID]: {
            'plugin name': 'Template',
          },
        },
      },
    ],
  },
});
