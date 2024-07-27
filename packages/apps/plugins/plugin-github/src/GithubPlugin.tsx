//
// Copyright 2023 DXOS.org
//

import { GithubLogo, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { createExtension, type Node } from '@braneframe/plugin-graph';
import { isMarkdownProperties } from '@braneframe/plugin-markdown';
import { memoizeQuery } from '@braneframe/plugin-space';
import { DocumentType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { getMeta, isSpace, Filter, type Space } from '@dxos/react-client/echo';

import { EmbeddedMain, ImportDialog, OctokitProvider, GitHubSettings, UrlDialog, MarkdownActions } from './components';
import meta, { GITHUB_PLUGIN, GITHUB_PLUGIN_SHORT_ID } from './meta';
import translations from './translations';
import { type GhIdentifier, type GithubPluginProvides, type GithubSettingsProps } from './types';

export const GithubPlugin = (): PluginDefinition<GithubPluginProvides> => {
  const settings = new LocalStorageStore<GithubSettingsProps>(GITHUB_PLUGIN);

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'pat', type: LocalStorageStore.string({ allowUndefined: true }) });
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          if (!client) {
            return [];
          }

          return createExtension({
            id: GITHUB_PLUGIN,
            filter: (node): node is Node<Space> => isSpace(node.data),
            connector: ({ node }) => {
              const documents = memoizeQuery(
                node.data,
                Filter.schema(DocumentType, (doc) =>
                  getMeta(doc)?.keys?.find((key) => key?.source?.includes('github')),
                ),
              );

              if (documents.length > 0) {
                return [
                  {
                    id: `${GITHUB_PLUGIN_SHORT_ID}:${node.id}`,
                    data: GITHUB_PLUGIN_SHORT_ID,
                    type: GITHUB_PLUGIN,
                    properties: {
                      label: ['plugin name', { ns: GITHUB_PLUGIN }],
                      icon: (props: IconProps) => <GithubLogo {...props} />,
                    },
                    // TODO(wittjosiah): Add documents.
                    // nodes: documents.map((doc) => ({}),
                  },
                ];
              }
            },
          });
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
                // TODO(burdon): Model should not be passed via surfaces.
                // return isEditorModel(data.model) ? (
                //   <ExportDialog
                //     model={data.model}
                //     type={data.type as ExportViewState}
                //     target={data.target as string | null}
                //     docGhId={data.docGhId as GhIdentifier}
                //   />
                // ) : null;
                case 'dxos.org/plugin/github/ExportDialog':
                  return null;
                case 'dxos.org/plugin/github/ImportDialog':
                  return (
                    <ImportDialog
                      docGhId={data.docGhId as GhIdentifier}
                      onUpdate={(content) => {
                        // TODO(burdon): Fire intent.
                        log.info('onUpdate', content);
                      }}
                    />
                  );
                default:
                  return null;
              }
            case 'menuitem':
              return typeof data.content === 'string' &&
                isMarkdownProperties(data.properties) &&
                !data.properties.readonly ? (
                <MarkdownActions content={data.content} properties={data.properties} />
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
