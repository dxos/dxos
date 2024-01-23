//
// Copyright 2023 DXOS.org
//

import { GithubLogo } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { isEditorModel, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { Folder, type Document } from '@braneframe/types';
import { type PluginDefinition } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getSpaceForObject, isTypedObject, SpaceState } from '@dxos/react-client/echo';

import {
  EmbeddedMain,
  ExportDialog,
  ImportDialog,
  Issue,
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
        builder: ({ parent }) => {
          // TODO(wittjosiah): Easier way to identify node which represents a space.
          const space = isTypedObject(parent.data) ? getSpaceForObject(parent.data) : undefined;
          if (!space || !(parent.data instanceof Folder) || parent.data.name !== space.key.toHex()) {
            return;
          }

          // TODO(dmaretskyi): Turn into subscription.
          if (space.state.get() !== SpaceState.READY) {
            return;
          }

          const query = space.db.query(filter);
          return effect(() => {
            if (query.objects.length === 0) {
              return;
            }

            const [presentationNode] = parent.addNode(GITHUB_PLUGIN, {
              id: `${GITHUB_PLUGIN_SHORT_ID}:${parent.id}`,
              label: ['plugin name', { ns: GITHUB_PLUGIN }],
              icon: (props) => <GithubLogo {...props} />,
            });

            query.objects.forEach((object) => objectToGraphNode(presentationNode, object));
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

const objectToGraphNode = (parent: Node, document: Document): Node => {
  const [child] = parent.addNode(GITHUB_PLUGIN, {
    id: document.id,
    label: document.title ?? ['document title placeholder', { ns: GITHUB_PLUGIN }],
    icon: (props) => <Issue {...props} />,
    data: document,
    properties: {
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
