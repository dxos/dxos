import { plate } from "@dxos/plate";
import template from "../template.t";

export default template.define.script({
  content: ({ input: { name }, imports }) => plate`
    ${imports}
    import { Asterisk } from '@phosphor-icons/react';

    import {
      definePlugin,
      type SurfaceProvides,
      type GraphBuilderProvides,
      type IntentResolverProvides,
      type TranslationsProvides,
    } from '@dxos/app-framework';

    export const PLUGIN_ID = '${name}';

    export type TemplatePluginProvides = SurfaceProvides &
      IntentResolverProvides &
      GraphBuilderProvides &
      TranslationsProvides & {};

    /**
     * See https://docs.dxos.org/composer/plugins/definition
     */
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
  `
})