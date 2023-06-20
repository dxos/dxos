//
// Copyright 2023 DXOS.org
//

import { ComposerModel } from '@dxos/aurora-composer';
import { TypedObject } from '@dxos/echo-schema';
import { ObservableObject } from '@dxos/observable-object';
import { PluginDefinition, definePlugin } from '@dxos/react-surface';
import { YText } from '@dxos/text-model';

import { MarkdownProperties, MarkdownMainStandalone, MarkdownMainEmbedded } from './components';

export const isMarkdown = (datum: unknown): datum is ComposerModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'content' in datum &&
      (typeof datum.content === 'string' || datum.content instanceof YText)
    : false;

export const isMarkdownProperties = (datum: unknown): datum is MarkdownProperties =>
  datum instanceof TypedObject || datum instanceof ObservableObject;

// TODO(wittjosiah): This explicit type should not be necessary, should be inferred from `definePlugin`.
export const MarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:markdown',
  },
  provides: {
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
      }

      return null;
    },
  },
});
