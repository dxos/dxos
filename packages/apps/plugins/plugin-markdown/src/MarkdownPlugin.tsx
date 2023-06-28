//
// Copyright 2023 DXOS.org
//

import { Plus, ArticleMedium } from '@phosphor-icons/react';
import get from 'lodash.get';
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

type MarkdownPluginProvides = SpaceProvides &
  TranslationsProvides & {
    // todo(thure): Refactor this to be DRY, but avoid circular dependencies. Do we need a package like `plugin-types` 😬? Alternatively, StackPlugin stories could exit its package, but we have no such precedent.
    stack: { creators: Record<string, any>[]; choosers: Record<string, any>[] };
  };

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
      stack: {
        creators: [
          {
            id: 'create-section-space-doc',
            testId: 'markdownPlugin.createSectionSpaceDocument',
            label: ['create section space document label', { ns: 'dxos:markdown' }],
            icon: ArticleMedium,
            create: () => new Document(),
          },
        ],
        choosers: [
          {
            id: 'choose-section-space-doc',
            testId: 'markdownPlugin.chooseSectionSpaceDocument',
            label: ['choose section space document label', { ns: 'dxos:markdown' }],
            icon: ArticleMedium,
            // todo(thure): This feature is unfinished and may change
            filter: (datum: unknown) => isMarkdown(get(datum, 'content', {})),
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
            if (isMarkdown(get(datum, 'object.content', {}))) {
              return MarkdownSection;
            }
            break;
        }

        return null;
      },
    },
  };
};
