//
// Copyright 2023 DXOS.org
//

import { GithubLogo } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { type RefObject } from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type MarkdownProvides, isMarkdown, isMarkdownProperties } from '@braneframe/plugin-markdown';
import {
  type SpacePluginProvides,
  GraphNodeAdapter,
  getIndices,
  getAppStateIndex,
  setAppStateIndex,
} from '@braneframe/plugin-space';
import { type Document } from '@braneframe/types';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Space, SpaceProxy } from '@dxos/react-client/echo';
import {
  type GraphBuilderProvides,
  type PluginDefinition,
  findPlugin,
  resolvePlugin,
  parseIntentPlugin,
  type TranslationsProvides,
  type SurfaceProvides,
} from '@dxos/app-framework';
import { type MarkdownComposerRef } from '@dxos/react-ui-editor';

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
import { type ExportViewState, GITHUB_PLUGIN, GITHUB_PLUGIN_SHORT_ID, type GhIdentifier } from './props';
import translations from './translations';

export type GithubSettingsProps = {
  pat: string;
};

export type GithubPluginProvides = SurfaceProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  MarkdownProvides & {
    settings: GithubSettingsProps;
  };

const filter = (obj: Document) => obj.__meta?.keys?.find((key) => key?.source?.includes('github'));

export const GithubPlugin = (): PluginDefinition<GithubPluginProvides> => {
  const settings = new LocalStorageStore<GithubSettingsProps>(GITHUB_PLUGIN);
  let adapter: GraphNodeAdapter<Document> | undefined;

  return {
    meta: {
      id: GITHUB_PLUGIN,
      shortId: GITHUB_PLUGIN_SHORT_ID,
    },
    ready: async (plugins) => {
      settings.prop(settings.values.$pat!, 'pat', LocalStorageStore.string);

      const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
      const appState = spacePlugin?.provides.space.appState;
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

      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({ dispatch, filter, adapter: objectToGraphNode, createGroup });
      }
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
        builder: ({ parent }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          return adapter?.createNodes(space, parent);
        },
      },
      context: (props) => <OctokitProvider {...props} />,
      surface: {
        component: ({ $role, $component, ...data }) => {
          switch ($component) {
            case `${GITHUB_PLUGIN}/embedded`:
              return <EmbeddedMain />;
          }

          switch ($role) {
            case 'dialog':
              switch (data.content) {
                case 'dxos.org/plugin/github/BindDialog':
                  return isMarkdownProperties(data.properties) ? <UrlDialog properties={data.properties} /> : null;
                case 'dxos.org/plugin/github/ExportDialog':
                  return isMarkdown(data.model) ? (
                    <ExportDialog
                      model={data.model}
                      type={data.type as ExportViewState}
                      target={data.target as string | null}
                      docGhId={data.docGhId as GhIdentifier}
                    />
                  ) : null;
                case 'dxos.org/plugin/github/ImportDialog':
                  return (
                    <ImportDialog
                      docGhId={data.docGhId as GhIdentifier}
                      editorRef={data.editorRef as RefObject<MarkdownComposerRef>}
                    />
                  );
                default:
                  return null;
              }
            case 'menuitem':
              return isMarkdown(data.model) && isMarkdownProperties(data.properties) && !data.properties.readOnly ? (
                <MarkdownActions
                  model={data.model}
                  properties={data.properties}
                  editorRef={data.editorRef as RefObject<MarkdownComposerRef>}
                />
              ) : null;
            case 'settings':
              return data.content === 'dxos.org/plugin/splitview/ProfileSettings' ? <PatInput /> : null;
            default:
              return null;
          }
        },
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
