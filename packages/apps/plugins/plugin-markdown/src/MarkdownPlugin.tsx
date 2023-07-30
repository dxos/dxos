//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, Plus } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import get from 'lodash.get';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Document as DocumentType } from '@braneframe/types';
import { ComposerModel, MarkdownComposerProps } from '@dxos/aurora-composer';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import {
  MarkdownMain,
  MarkdownMainEmbedded,
  MarkdownMainEmpty,
  MarkdownSection,
  SpaceMarkdownChooser,
} from './components';
import translations from './translations';
import { MARKDOWN_PLUGIN, MarkdownAction, MarkdownPluginProvides, MarkdownProperties } from './types';
import {
  documentToGraphNode,
  isMarkdown,
  isMarkdownContent,
  isMarkdownPlaceholder,
  isMarkdownProperties,
  markdownPlugins,
} from './util';

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const state = deepSignal<{ onChange: NonNullable<MarkdownComposerProps['onChange']>[] }>({ onChange: [] });
  const adapter = new GraphNodeAdapter(DocumentType.filter(), documentToGraphNode);

  const MarkdownMainStandalone = ({
    data: { composer, properties },
  }: {
    data: { composer: ComposerModel; properties: MarkdownProperties };
    role?: string;
  }) => {
    return (
      <MarkdownMain
        model={composer}
        properties={properties}
        layout='standalone'
        onChange={(text) => state.onChange.forEach((onChange) => onChange(text))}
      />
    );
  };

  return {
    meta: {
      id: MARKDOWN_PLUGIN,
    },
    ready: async (plugins) => {
      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          state.onChange.push(plugin.provides.markdown.onChange);
        }
      });
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: 'create-doc', // `${MARKDOWN_PLUGIN}/create-doc`,
              index: 'a1',
              testId: 'spacePlugin.createDocument',
              label: ['create document label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <Plus {...props} />,
              disposition: 'toolbar', // TODO(burdon): Both places.
              intent: [
                {
                  plugin: MARKDOWN_PLUGIN,
                  action: MarkdownAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-doc', // TODO(burdon): "-space-" ?
            testId: 'markdownPlugin.createSectionSpaceDocument',
            label: ['create stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            intent: {
              plugin: MARKDOWN_PLUGIN,
              action: MarkdownAction.CREATE,
            },
          },
        ],
        // TODO(burdon): Selectors/filters?
        choosers: [
          {
            id: 'choose-stack-section-doc',
            testId: 'markdownPlugin.chooseSectionSpaceDocument',
            label: ['choose stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            filter: isMarkdownContent,
          },
        ],
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        // TODO(burdon): Document.
        switch (role) {
          case 'main': {
            if (
              'composer' in data &&
              isMarkdown(data.composer) &&
              'properties' in data &&
              isMarkdownProperties(data.properties)
            ) {
              if ('view' in data && data.view === 'embedded') {
                return MarkdownMainEmbedded;
              } else {
                return MarkdownMainStandalone;
              }
            } else if (
              'composer' in data &&
              isMarkdownPlaceholder(data.composer) &&
              'properties' in data &&
              isMarkdownProperties(data.properties)
            ) {
              return MarkdownMainEmpty;
            }
            break;
          }

          case 'section': {
            if (isMarkdown(get(data, 'object.content', {}))) {
              return MarkdownSection;
            }
            break;
          }

          // TODO(burdon): Review with @thure.
          case 'dialog': {
            if (
              get(data, 'subject') === 'dxos.org/plugin/stack/chooser' &&
              get(data, 'id') === 'choose-stack-section-doc'
            ) {
              return SpaceMarkdownChooser;
            }
            break;
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MarkdownAction.CREATE: {
              return { object: new DocumentType() };
            }
          }
        },
      },
    },
  };
};
