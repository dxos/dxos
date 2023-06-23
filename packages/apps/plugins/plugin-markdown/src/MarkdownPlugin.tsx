//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ComposerModel, MarkdownComposerProps } from '@dxos/aurora-composer';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
import { definePlugin, Plugin, PluginDefinition } from '@dxos/react-surface';

import { MarkdownMain, StandaloneLayout } from './components';
import { MarkdownSection } from './components/MarkdownSection';
import { MarkdownProperties, isMarkdown, isMarkdownPlaceholder, isMarkdownProperties } from './props';
import translations from './translations';

const store = createStore<{ onChange: NonNullable<MarkdownComposerProps['onChange']>[] }>({ onChange: [] });

const MarkdownMainStandalone = observer(
  ({ data: [model, properties] }: { data: [ComposerModel, MarkdownProperties]; role?: string }) => {
    return (
      <MarkdownMain
        model={model}
        properties={properties}
        layout='standalone'
        onChange={(text) => store.onChange.forEach((onChange) => onChange(text))}
      />
    );
  },
);

const MarkdownMainEmbedded = ({
  data: [model, properties, _],
}: {
  data: [ComposerModel, MarkdownProperties, 'embedded'];
  role?: string;
}) => {
  return <MarkdownMain model={model} properties={properties} layout='embedded' />;
};

const MarkdownMainEmpty = ({ data: [model, properties] }: { data: [any, MarkdownProperties] }) => {
  return (
    <StandaloneLayout model={model} properties={properties}>
      <model.content />
    </StandaloneLayout>
  );
};

export type MarkdownProvides = {
  markdown: {
    onChange: MarkdownComposerProps['onChange'];
  };
};

type MarkdownPlugin = Plugin<MarkdownProvides>;

export const markdownPlugins = (plugins: Plugin[]): MarkdownPlugin[] => {
  return (plugins as MarkdownPlugin[]).filter((p) => Boolean(p.provides?.markdown));
};

// TODO(wittjosiah): This explicit type should not be necessary, should be inferred from `definePlugin`.
export const MarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:markdown',
  },
  ready: async (plugins) => {
    markdownPlugins(plugins).forEach((plugin) => {
      if (plugin.provides.markdown.onChange) {
        store.onChange.push(plugin.provides.markdown.onChange);
      }
    });
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
          } else if (Array.isArray(datum) && isMarkdownPlaceholder(datum[0]) && isMarkdownProperties(datum[1])) {
            return MarkdownMainEmpty;
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
