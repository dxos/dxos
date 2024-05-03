import { plate } from "@dxos/plate";
import template from "../template.t";

export default template.define.script({
  content: ({ input: { name }, imports }) => plate/* javascript */`
    ${imports}
    import React from 'react';
    import { Asterisk } from '@phosphor-icons/react';

    import {
      PluginDefinition,
      type SurfaceProvides,
      type GraphBuilderProvides,
      type IntentResolverProvides,
      type TranslationsProvides,
      pluginMeta,
    } from '@dxos/app-framework';

    export const PLUGIN_ID = '${name}';
    
    export const meta = pluginMeta({
      id: PLUGIN_ID,
      name: "",
      iconComponent: Asterisk,
    });

    export type TemplatePluginProvides = SurfaceProvides &
      IntentResolverProvides &
      GraphBuilderProvides &
      TranslationsProvides & {};

    /**
     * See https://docs.dxos.org/composer/plugins/definition
     */
    const plugin = (): PluginDefinition<TemplatePluginProvides> => {
      return { 
        meta,
        provides: {
          root: () => null,
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
      };
    };
    export default plugin;
  `
})