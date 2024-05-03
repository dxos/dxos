//
// Copyright 2023 DXOS.org
//

import { File, FilePlus, Folder, FolderPlus, X, type IconProps, Plugs, FloppyDisk } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import localforage from 'localforage';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type MarkdownExtensionProvides } from '@braneframe/plugin-markdown';
import {
  resolvePlugin,
  type PluginDefinition,
  parseGraphPlugin,
  parseIntentPlugin,
  NavigationAction,
  parseNavigationPlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, Trigger } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { listener } from '@dxos/react-ui-editor';

import { LocalFileMain } from './components';
import meta, { FILES_PLUGIN } from './meta';
import translations from './translations';
import { type LocalEntity, type LocalFile, LocalFilesAction, type LocalFilesPluginProvides } from './types';
import {
  PREFIX,
  findFile,
  getDirectoryChildren,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  isLocalFile,
  legacyFileToLocalFile,
} from './util';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownExtensionProvides> => {
  let onFilesUpdate: ((node?: Node<LocalEntity>) => void) | undefined;
  const state = create<{ files: LocalEntity[]; current: LocalFile | undefined }>({
    files: [],
    current: undefined,
  });
  const subscriptions = new EventSubscriptions();

  const handleKeyDown = async (event: KeyboardEvent) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === 's' && modifier && state.current) {
      event.preventDefault();
      await handleSave(state.current);
      onFilesUpdate?.();
    }
  };

  return {
    meta,
    initialize: async () => {
      const value = await localforage.getItem<FileSystemHandle[]>(FILES_PLUGIN);
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(async (handle) => {
            if (handle.kind === 'file') {
              const file = await handleToLocalFile(handle);
              state.files.push(file);
            } else if (handle.kind === 'directory') {
              const directory = await handleToLocalDirectory(handle);
              state.files.push(directory);
            }
          }),
        );
      }

      return {
        markdown: {
          extensions: () => [
            listener({
              onChange: (text) => {
                if (state.current) {
                  state.current.text = text.toString();
                  state.current.modified = true;
                  onFilesUpdate?.();
                }
              },
            }),
          ],
        },
      };
    },
    ready: async (plugins) => {
      window.addEventListener('keydown', handleKeyDown);

      // Subscribe to graph to track the currently active file.
      const navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      if (navigationPlugin && graphPlugin) {
        subscriptions.add(
          effect(() => {
            const active = navigationPlugin.provides.location.active;
            const path =
              active && graphPlugin.provides.graph.getPath({ target: active })?.filter((id) => id.startsWith(PREFIX));
            const current = (active?.startsWith(PREFIX) && path && findFile(state.files, path)) || undefined;
            if (state.current !== current) {
              state.current = current;
            }
          }),
        );
      }
    },
    unload: async () => {
      onFilesUpdate = undefined;
      subscriptions.clear();
      window.removeEventListener('keydown', handleKeyDown);
    },
    provides: {
      translations,
      surface: {
        component: ({ data, role }) => {
          if (!isLocalFile(data.active)) {
            return null;
          }

          switch (role) {
            case 'main': {
              return <LocalFileMain file={data.active} />;
            }
          }

          return null;
        },
      },
      graph: {
        builder: (plugins, graph) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          graph.addNodes({
            id: 'all-files',
            // TODO(burdon): Factor out palette constants.
            properties: {
              label: ['plugin name', { ns: FILES_PLUGIN }],
              palette: 'yellow',
              role: 'branch',
            },
            edges: [['root', 'inbound']],
            nodes: [
              {
                id: 'open-file-handle',
                data: () =>
                  intentPlugin?.provides.intent.dispatch([
                    {
                      plugin: FILES_PLUGIN,
                      action: LocalFilesAction.OPEN_FILE,
                    },
                    { action: NavigationAction.ACTIVATE },
                  ]),
                properties: {
                  label: ['open file label', { ns: FILES_PLUGIN }],
                  icon: (props: IconProps) => <FilePlus {...props} />,
                },
              },
              ...('showDirectoryPicker' in window
                ? [
                    {
                      id: 'open-directory',
                      data: () =>
                        intentPlugin?.provides.intent.dispatch([
                          {
                            plugin: FILES_PLUGIN,
                            action: LocalFilesAction.OPEN_DIRECTORY,
                          },
                          { action: NavigationAction.ACTIVATE },
                        ]),
                      properties: {
                        label: ['open directory label', { ns: FILES_PLUGIN }],
                        icon: (props: IconProps) => <FolderPlus {...props} />,
                      },
                    },
                  ]
                : []),
            ],
          });

          let previousFiles = [...state.files];
          const unsubscribe = effect(() => {
            void localforage.setItem(FILES_PLUGIN, state.files.map((file) => file.handle).filter(Boolean));

            const removedFiles = previousFiles.filter((file) => !state.files.includes(file));
            previousFiles = [...state.files];

            batch(() => {
              removedFiles.forEach((file) => {
                graph.removeNode(file.id, true);
                if ('children' in file) {
                  file.children.forEach((entity) => graph.removeNode(entity.id, true));
                }
                // TODO(wittjosiah): Actions are not being removed here.
              });
              state.files.forEach((entity) => {
                graph.addNodes({
                  id: entity.id,
                  data: entity,
                  properties: {
                    label: entity.title,
                    icon: (props: IconProps) => ('children' in entity ? <Folder {...props} /> : <File {...props} />),
                    modified: 'children' in entity ? undefined : entity.modified,
                  },
                  edges: [['all-files', 'inbound']],
                  nodes: [
                    {
                      id: `${LocalFilesAction.CLOSE}:${entity.id}`,
                      data: () =>
                        intentPlugin?.provides.intent.dispatch({
                          plugin: FILES_PLUGIN,
                          action: LocalFilesAction.CLOSE,
                          data: { id: entity.id },
                        }),
                      properties: {
                        label: ['close label', { ns: FILES_PLUGIN }],
                        icon: (props: IconProps) => <X {...props} />,
                      },
                    },
                    ...(entity.permission !== 'granted'
                      ? [
                          {
                            id: `${LocalFilesAction.RECONNECT}:${entity.id}`,
                            data: () =>
                              intentPlugin?.provides.intent.dispatch({
                                plugin: FILES_PLUGIN,
                                action: LocalFilesAction.RECONNECT,
                                data: { id: entity.id },
                              }),
                            properties: {
                              label: ['re-open label', { ns: FILES_PLUGIN }],
                              icon: (props: IconProps) => <Plugs {...props} />,
                              disposition: 'default',
                            },
                          },
                        ]
                      : []),
                    ...(entity.permission === 'granted' && !('children' in entity)
                      ? [
                          {
                            id: `${LocalFilesAction.SAVE}:${entity.id}`,
                            data: () =>
                              intentPlugin?.provides.intent.dispatch({
                                plugin: FILES_PLUGIN,
                                action: LocalFilesAction.SAVE,
                                data: { id: entity.id },
                              }),
                            properties: {
                              label: [entity.handle ? 'save label' : 'save as label', { ns: FILES_PLUGIN }],
                              icon: (props: IconProps) => <FloppyDisk {...props} />,
                            },
                          },
                        ]
                      : []),
                    ...('children' in entity
                      ? entity.children.map((child) => ({
                          id: child.id,
                          data: child,
                          properties: {
                            label: child.title,
                            icon: (props: IconProps) => <File {...props} />,
                          },
                        }))
                      : []),
                  ],
                });
              });
            });
          });

          return () => unsubscribe();
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case LocalFilesAction.OPEN_FILE: {
              if ('showOpenFilePicker' in window) {
                const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
                  mode: 'readwrite',
                  types: [
                    {
                      description: 'Markdown',
                      accept: { 'text/markdown': ['.md'] },
                    },
                  ],
                });
                const file = await handleToLocalFile(handle);
                state.files.push(file);

                return { data: [file.id] };
              }

              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.md,text/markdown';
              const result = new Trigger<string[]>();
              input.onchange = async () => {
                const [legacyFile] = input.files ? Array.from(input.files) : [];
                if (legacyFile) {
                  const file = await legacyFileToLocalFile(legacyFile);
                  state.files.push(file);
                  result.wake([file.id]);
                }
              };
              input.click();
              return { data: await result };
            }

            case LocalFilesAction.OPEN_DIRECTORY: {
              const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              const directory = await handleToLocalDirectory(handle);
              state.files.push(directory);
              return { data: [directory.id, directory.children[0]?.id] };
            }

            case LocalFilesAction.RECONNECT: {
              const entity = state.files.find((entity) => entity.id === intent.data?.id);
              if (!entity) {
                break;
              }

              if ('children' in entity) {
                const permission = await (entity.handle as any).requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                  entity.children = await getDirectoryChildren(entity.handle, entity.handle.name);
                  entity.permission = permission;
                  onFilesUpdate?.();
                }
              } else {
                const permission = await (entity.handle as any)?.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                  const text = await (entity.handle as any).getFile?.().then((file: any) => file.text());
                  entity.text = text;
                  entity.permission = permission;
                  onFilesUpdate?.();
                }
              }

              return { data: true };
            }

            case LocalFilesAction.SAVE: {
              const file = findFile(state.files, intent.data?.id);
              if (file) {
                await handleSave(file);
                onFilesUpdate?.();
                return { data: true };
              }
              break;
            }

            case LocalFilesAction.CLOSE: {
              if (typeof intent.data?.id === 'string') {
                const index = state.files.findIndex((f) => f.id === intent.data?.id);
                if (index >= 0) {
                  state.files.splice(index, 1);
                  onFilesUpdate?.();
                  return { data: true };
                }
              }
              break;
            }
          }
        },
      },
    },
  };
};
