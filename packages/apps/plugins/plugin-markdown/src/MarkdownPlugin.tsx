//
// Copyright 2023 DXOS.org
//

import { PluginDefinition, definePlugin } from '@dxos/react-surface';

import { MarkdownMainStandalone, MarkdownMainEmbedded } from './components';
import { MarkdownSection } from './components/MarkdownSection';
import { isMarkdown, isMarkdownProperties } from './props';
import translations from './translations';

// TODO(wittjosiah): This explicit type should not be necessary, should be inferred from `definePlugin`.
export const MarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:markdown',
  },
  provides: {
    translations,
    // TODO(wittjosiah): Type unknown in framework.
    component: (datum: unknown, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1])) {
            if (datum[2] === 'embedded') {
              return MarkdownMainEmbedded;
            } else {
              return MarkdownMainStandalone;
            }
          }
          break;
        case 'section':
          if (datum && typeof datum === 'object' && 'object' in datum && isMarkdown(datum.object)) {
            return MarkdownSection;
          }
      }

      return null;
    },
  },
});
