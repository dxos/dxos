//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { SpaceProvides } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Document } from '@braneframe/types';
import { ComposerModel, MarkdownComposerProps } from '@dxos/aurora-composer';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
import { Plugin, PluginDefinition } from '@dxos/react-surface';

import { MarkdownMain, MarkdownMainEmbedded, MarkdownMainEmpty } from './components';
import { MarkdownSection } from './components/MarkdownSection';
import { MarkdownProperties, isMarkdown, isMarkdownPlaceholder, isMarkdownProperties } from './props';
import translations from './translations';

export type MarkdownProvides = {
  markdown: {
    onChange: MarkdownComposerProps['onChange'];
  };
};

export type MarkdownPlugin = Plugin<MarkdownProvides>;

export const markdownPlugins = (plugins: Plugin[]): MarkdownPlugin[] => {
  return (plugins as MarkdownPlugin[]).filter((p) => Boolean(p.provides?.markdown));
};

type MarkdownPluginProvides = SpaceProvides & TranslationsProvides;

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
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
  return {
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
      space: {
        types: [
          {
            id: 'create-doc',
            testId: 'spacePlugin.createDocument',
            label: ['create document label', { ns: 'composer' }],
            icon: Plus,
            Type: Document,
          },
        ],
      },
      translations,
      component: (datum, role) => {
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
  };
};
