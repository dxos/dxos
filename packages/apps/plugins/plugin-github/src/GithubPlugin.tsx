//
// Copyright 2023 DXOS.org
//

import { GithubLogo } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { Node, GraphProvides } from '@braneframe/plugin-graph';
import { MarkdownProvides, isMarkdown, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { GraphNodeAdapter, getIndices } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewPluginProvides, getAppStateIndex, setAppStateIndex } from '@braneframe/plugin-treeview';
import { AppState, Document } from '@braneframe/types';
import { LocalStorageStore } from '@dxos/local-storage';
import { Space, SpaceProxy } from '@dxos/react-client/echo';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import {
  EmbeddedMain,
  ExportDialog,
  ImportDialog,
  Issue,
  MarkdownActions,
  OctokitProvider,
  PatInput,
  UrlDialog,
} from './components';
import { GITHUB_PLUGIN, GITHUB_PLUGIN_SHORT_ID } from './props';
import translations from './translations';

export type GithubSettingsProps = {
  pat: string;
};

export type GithubPluginProvides = TranslationsProvides &
  MarkdownProvides &
  GraphProvides & {
    settings: GithubSettingsProps;
  };

const filter = (obj: Document) => obj.__meta?.keys?.find((key) => key?.source?.includes('github'));

export const GithubPlugin = (): PluginDefinition<GithubPluginProvides> => {
  let adapter: GraphNodeAdapter<Document> | undefined;
  const settings = new LocalStorageStore<GithubSettingsProps>('braneframe.plugin-github');

  return {
    meta: {
      id: GITHUB_PLUGIN,
      shortId: GITHUB_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      settings.prop(settings.values.$pat!, 'pat', LocalStorageStore.string);

      const treeViewPlugin = findPlugin<TreeViewPluginProvides>(plugins, 'dxos.org/plugin/treeview');
      const appState = treeViewPlugin?.provides.treeView?.appState as AppState | undefined;
      const defaultIndices = getIndices(plugins.length);

      const createGroup = (parent: Node) => {
        const id = `${GITHUB_PLUGIN_SHORT_ID}:${parent.id}`;
        const [presentationNode] = parent.addNode(GITHUB_PLUGIN, {
          id,
          label: ['plugin name', { ns: GITHUB_PLUGIN }],
          icon: (props) => <GithubLogo {...props} />,
          properties: {
            palette: 'pink',
            persistenceClass: 'appState',
            childrenPersistenceClass: 'spaceObject',
            index:
              getAppStateIndex(id, appState) ??
              setAppStateIndex(
                id,
                defaultIndices[plugins.findIndex(({ meta: { id } }) => id === GITHUB_PLUGIN)],
                appState,
              ),
          },
        });

        return presentationNode;
      };

      adapter = new GraphNodeAdapter({ filter, adapter: objectToGraphNode, createGroup });
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      settings: settings.values,
      translations,
      markdown: {
        filter: (obj) => !filter(obj),
      },
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          return adapter?.createNodes(space, parent);
        },
      },
      context: (props) => <OctokitProvider {...props} />,
      component: (data, role) => {
        switch (role) {
          case 'dialog':
            switch (true) {
              case data === 'dxos.org/plugin/splitview/ProfileSettings':
                return PatInput;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/BindDialog':
                return UrlDialog;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/ExportDialog':
                return ExportDialog;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/ImportDialog':
                return ImportDialog;
              default:
                return null;
            }
          case 'menuitem':
            return Array.isArray(data) && isMarkdown(data[0]) && isMarkdownProperties(data[1]) && !data[1].readOnly
              ? MarkdownActions
              : null;
          default:
            return null;
        }
      },
      components: {
        embedded: EmbeddedMain,
      },
    },
  };
};

const objectToGraphNode = (parent: Node<Space>, document: Document, index: string): Node => {
  const [child] = parent.addNode(GITHUB_PLUGIN, {
    id: document.id,
    label: document.title ?? ['document title placeholder', { ns: GITHUB_PLUGIN }],
    icon: (props) => <Issue {...props} />,
    data: document,
    properties: {
      index: get(document, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
