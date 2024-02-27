//
// Copyright 2023 DXOS.org
//

import { GithubLogo, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { manageNodes } from '@braneframe/plugin-graph';
import { isEditorModel, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { type Document } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceState } from '@dxos/react-client/echo';

import {
  EmbeddedMain,
  ExportDialog,
  ImportDialog,
  MarkdownActions,
  OctokitProvider,
  GitHubSettings,
  UrlDialog,
} from './components';
import meta, { GITHUB_PLUGIN, GITHUB_PLUGIN_SHORT_ID } from './meta';
import translations from './translations';
import { type ExportViewState, type GhIdentifier, type GithubPluginProvides, type GithubSettingsProps } from './types';

// TODO(dmaretskyi): Meta filters?.
const filter = (obj: Document) => obj.__meta?.keys?.find((key) => key?.source?.includes('github'));

export const GithubPlugin = (): PluginDefinition<GithubPluginProvides> => {
  const settings = new LocalStorageStore<GithubSettingsProps>(GITHUB_PLUGIN);

  return {
    meta,
    ready: async () => {
      settings.prop(settings.values.$pat!, 'pat', LocalStorageStore.string);
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        builder: (plugins, graph) => {
          const subscriptions = new EventSubscriptions();
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          if (!client) {
            return;
          }

          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            spaces.forEach((space) => {
              if (space.state.get() !== SpaceState.READY) {
                return;
              }

              const query = space.db.query(filter);
              let previousObjects: Document[] = [];
              subscriptions.add(
                effect(() => {
                  const id = `${GITHUB_PLUGIN_SHORT_ID}:${space.key.toHex()}`;

                  manageNodes({
                    graph,
                    condition: query.objects.length > 0,
                    removeEdges: true,
                    nodes: [
                      {
                        id,
                        data: 'github',
                        properties: {
                          label: ['plugin name', { ns: GITHUB_PLUGIN }],
                          icon: (props: IconProps) => <GithubLogo {...props} />,
                        },
                        edges: [[space.key.toHex(), 'inbound']],
                      },
                    ],
                  });

                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;
                  removedObjects.forEach((object) => graph.removeEdge(id, object.id));
                  // TODO(wittjosiah): Update icon to `Issue` icon.
                  query.objects.forEach((object) => graph.addEdge(id, object.id));
                }),
              );
            });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
        },
      },
      context: (props) => (
        <OctokitProvider pat={settings.values.pat} onPatChanged={(pat) => (settings.values.pat = pat)} {...props} />
      ),
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${GITHUB_PLUGIN}/embedded`:
              return <EmbeddedMain />;
          }

          switch (role) {
            case 'dialog':
              switch (data.content) {
                case 'dxos.org/plugin/github/BindDialog':
                  return isMarkdownProperties(data.properties) ? <UrlDialog properties={data.properties} /> : null;
                case 'dxos.org/plugin/github/ExportDialog':
                  return isEditorModel(data.model) ? (
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
                      onUpdate={(content) => {
                        // TODO(burdon): Fire intent.
                        console.log('onUpdate', content);
                      }}
                    />
                  );
                default:
                  return null;
              }
            case 'menuitem':
              return isEditorModel(data.model) && isMarkdownProperties(data.properties) && !data.properties.readonly ? (
                <MarkdownActions model={data.model} properties={data.properties} />
              ) : null;
            case 'settings':
              return data.plugin === meta.id ? <GitHubSettings /> : null;
            default:
              return null;
          }
        },
      },
    },
  };
};
