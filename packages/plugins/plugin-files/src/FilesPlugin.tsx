//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import { pipe } from 'effect';
import localforage from 'localforage';
import React from 'react';

import {
  resolvePlugin,
  type PluginDefinition,
  parseGraphPlugin,
  parseIntentPlugin,
  NavigationAction,
  type SerializedNode,
  type NodeSerializer,
  SettingsAction,
  filterPlugins,
  parseGraphSerializerPlugin,
  createSurface,
  createIntent,
  chain,
  createResolver,
} from '@dxos/app-framework';
import { EventSubscriptions, Trigger } from '@dxos/async';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { parseAttentionPlugin } from '@dxos/plugin-attention';
import { createExtension, isActionLike, ROOT_TYPE, type Node } from '@dxos/plugin-graph';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import { listener } from '@dxos/react-ui-editor';
import { type MaybePromise } from '@dxos/util';

import { FilesSettings, LocalFileContainer } from './components';
import { ExportStatus } from './components/ExportStatus';
import meta, { FILES_PLUGIN } from './meta';
import translations from './translations';
import {
  type LocalEntity,
  LocalFilesAction,
  type LocalFilesPluginProvides,
  type LocalDirectory,
  type FilesState,
  type FilesSettingsProps,
  type LocalFile,
} from './types';
import {
  PREFIX,
  findFile,
  getDirectoryChildren,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  isLocalDirectory,
  isLocalEntity,
  isLocalFile,
  legacyFileToLocalFile,
} from './util';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = (): PluginDefinition<LocalFilesPluginProvides, MarkdownExtensionProvides> => {
  const settings = new LocalStorageStore<FilesSettingsProps>(FILES_PLUGIN, {
    autoExport: false,
    autoExportInterval: 30_000,
  });
  const state = new LocalStorageStore<FilesState>(FILES_PLUGIN, {
    exportRunning: false,
    files: [],
    current: undefined,
  });
  const subscriptions = new EventSubscriptions();
  const directoryHandles: Record<string, FileSystemDirectoryHandle> = {};
  const directoryNameCounter: Record<string, Record<string, number>> = {};

  const exportFile = async ({ node, path, serialized }: { node: Node; path: string[]; serialized: SerializedNode }) => {
    if (!settings.values.rootHandle) {
      return;
    }

    if (node.id === 'root') {
      Object.keys(directoryHandles).forEach((key) => delete directoryHandles[key]);
      Object.keys(directoryNameCounter).forEach((key) => delete directoryNameCounter[key]);
      directoryHandles[''] = settings.values.rootHandle!;
      directoryNameCounter[''] = {};
      for await (const name of (settings.values.rootHandle as any).keys()) {
        await settings.values.rootHandle!.removeEntry(name, { recursive: true });
      }
      return;
    }

    const parentPath = path.slice(0, -1).join('/');
    const parentHandle = directoryHandles[parentPath];
    if (!parentHandle || !(parentHandle instanceof FileSystemDirectoryHandle)) {
      log.warn('missing parent handle', { id: node.id, parentHandle: !!parentHandle });
      return;
    }

    try {
      const nameCounter = directoryNameCounter[parentPath] ?? (directoryNameCounter[parentPath] = {});
      const count = nameCounter[serialized.name] ?? 0;
      const name = getFileName(serialized, count);
      nameCounter[serialized.name] = count + 1;

      if (node.properties.role === 'branch') {
        const handle = await parentHandle.getDirectoryHandle(name, { create: true });
        const pathString = path.join('/');
        directoryHandles[pathString] = handle;

        const metadataHandle = await handle.getFileHandle('.composer.json', { create: true });
        // Write original node type to metadata file so the correct serializer can be used during import.
        // For directories, the type cannot be inferred from the file extension.
        const metadata = {
          type: node.type,
        };
        await writeFile(metadataHandle, JSON.stringify(metadata, null, 2));
      } else {
        const handle = await parentHandle.getFileHandle(name, { create: true });
        await writeFile(handle, serialized.data);
      }
    } catch (err) {
      log.catch(err);
    }
  };

  return {
    meta,
    initialize: async () => {
      state.prop({ key: 'lastExport', type: LocalStorageStore.number({ allowUndefined: true }) });

      settings
        .prop({ key: 'autoExport', type: LocalStorageStore.bool() })
        .prop({ key: 'autoExportInterval', type: LocalStorageStore.number() })
        .prop({ key: 'openLocalFiles', type: LocalStorageStore.bool({ allowUndefined: true }) });

      settings.values.rootHandle = (await localforage.getItem(`${FILES_PLUGIN}/rootHandle`)) ?? undefined;

      subscriptions.add(
        effect(() => {
          const rootHandle = settings.values.rootHandle;
          if (rootHandle) {
            void localforage.setItem(`${FILES_PLUGIN}/rootHandle`, rootHandle);
          }
        }),
      );

      const value = await localforage.getItem<FileSystemHandle[]>(FILES_PLUGIN);
      if (Array.isArray(value) && settings.values.openLocalFiles) {
        await Promise.all(
          value.map(async (handle) => {
            if (handle.kind === 'file') {
              const file = await handleToLocalFile(handle);
              state.values.files.push(file);
            } else if (handle.kind === 'directory') {
              const directory = await handleToLocalDirectory(handle);
              state.values.files.push(directory);
            }
          }),
        );
      }

      return {
        markdown: {
          extensions: () => [
            listener({
              onChange: (text, id) => {
                if (
                  settings.values.openLocalFiles &&
                  state.values.current &&
                  state.values.current.id === id &&
                  state.values.current.text !== text
                ) {
                  state.values.current.text = text.toString();
                  state.values.current.modified = true;
                }
              },
            }),
          ],
        },
      };
    },
    ready: async ({ plugins }) => {
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
      subscriptions.add(
        effect(() => {
          if (!settings.values.autoExport || !settings.values.rootHandle || !dispatch) {
            return;
          }

          const interval = setInterval(async () => {
            if (state.values.exportRunning) {
              return;
            }

            state.values.exportRunning = true;
            await dispatch(createIntent(LocalFilesAction.Export));
            state.values.exportRunning = false;
          }, settings.values.autoExportInterval);

          return () => clearInterval(interval);
        }),
      );

      subscriptions.add(
        effect(() => {
          if (!settings.values.openLocalFiles) {
            return;
          }

          const fileHandles = state.values.files.map((file) => file.handle).filter(Boolean);
          void localforage.setItem(FILES_PLUGIN, fileHandles);
        }),
      );

      // Subscribe to attention to track the currently active file.
      const attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      if (attentionPlugin) {
        subscriptions.add(
          scheduledEffect(
            () => ({
              openLocalFiles: settings.values.openLocalFiles,
              attended: attentionPlugin.provides.attention.attended,
            }),
            ({ openLocalFiles, attended }) => {
              if (!openLocalFiles) {
                return;
              }

              const active = attended?.[0];
              const current =
                (active?.startsWith(PREFIX) && attended && findFile(state.values.files, attended)) || undefined;
              if (state.values.current !== current) {
                state.values.current = current;
              }
            },
          ),
        );
      }
    },
    unload: async () => {
      subscriptions.clear();
    },
    provides: {
      settings: settings.values,
      translations,
      surface: {
        definitions: () => [
          createSurface({
            id: `${FILES_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
            component: ({ data }) => <LocalFileContainer file={data.subject} />,
          }),
          createSurface({
            id: `${FILES_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === meta.id,
            component: () => <FilesSettings settings={settings.values} />,
          }),
          createSurface({
            id: `${FILES_PLUGIN}/status`,
            role: 'status',
            filter: (data): data is any => settings.values.autoExport,
            component: () => <ExportStatus running={state.values.exportRunning} lastExport={state.values.lastExport} />,
          }),
        ],
      },
      graph: {
        builder: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;

          return [
            // Create export/import actions.
            createExtension({
              id: `${FILES_PLUGIN}/export`,
              filter: (node): node is Node<null> => node.id === 'root',
              actions: () => [
                {
                  id: LocalFilesAction.Export._tag,
                  data: async () => {
                    await dispatch?.(createIntent(LocalFilesAction.Export));
                  },
                  properties: {
                    label: ['export label', { ns: FILES_PLUGIN }],
                    icon: 'ph--floppy-disk--regular',
                  },
                },
                {
                  id: LocalFilesAction.Import._tag,
                  data: async () => {
                    await dispatch?.(createIntent(LocalFilesAction.Import));
                  },
                  properties: {
                    label: ['import label', { ns: FILES_PLUGIN }],
                    icon: 'ph--folder-open--regular',
                  },
                },
              ],
            }),

            // Create files group node.
            createExtension({
              id: `${FILES_PLUGIN}/root`,
              filter: (node): node is Node<null> => node.id === 'root',
              connector: () =>
                settings.values.openLocalFiles
                  ? [
                      {
                        id: FILES_PLUGIN,
                        type: FILES_PLUGIN,
                        // TODO(burdon): Factor out palette constants.
                        properties: {
                          label: ['plugin name', { ns: FILES_PLUGIN }],
                          role: 'branch',
                        },
                      },
                    ]
                  : [],
            }),

            // Create files nodes.
            createExtension({
              id: `${FILES_PLUGIN}/files`,
              filter: (node): node is Node<null> => node.id === FILES_PLUGIN,
              actions: () => [
                {
                  id: LocalFilesAction.OpenFile._tag,
                  data: async () => {
                    await dispatch?.(pipe(createIntent(LocalFilesAction.OpenFile), chain(NavigationAction.Open, {})));
                  },
                  properties: {
                    label: ['open file label', { ns: FILES_PLUGIN }],
                    icon: 'ph--file-plus--regular',
                  },
                },
                ...('showDirectoryPicker' in window
                  ? [
                      {
                        id: 'open-directory',
                        data: async () => {
                          await dispatch?.(
                            pipe(createIntent(LocalFilesAction.OpenDirectory), chain(NavigationAction.Open, {})),
                          );
                        },
                        properties: {
                          label: ['open directory label', { ns: FILES_PLUGIN }],
                          icon: 'ph--folder-plus--regular',
                        },
                      },
                    ]
                  : []),
              ],
              connector: () =>
                state.values.files.map((entity) => ({
                  id: entity.id,
                  type: isLocalDirectory(entity) ? 'directory' : 'file',
                  data: entity,
                  properties: {
                    label: entity.name,
                    icon: 'children' in entity ? 'ph--folder--regular' : 'ph--file--regular',
                    modified: 'children' in entity ? undefined : entity.modified,
                  },
                })),
            }),

            // Create sub-files nodes.
            createExtension({
              id: `${FILES_PLUGIN}/sub-files`,
              filter: (node): node is Node<LocalDirectory> => isLocalDirectory(node.data),
              connector: ({ node }) =>
                node.data.children.map((child) => ({
                  id: child.id,
                  type: 'file',
                  data: child,
                  properties: {
                    label: child.name,
                    icon: 'ph--file--regular',
                  },
                })),
            }),

            // Create file actions.
            createExtension({
              id: `${FILES_PLUGIN}/actions`,
              filter: (node): node is Node<LocalEntity> => isLocalEntity(node.data),
              actions: ({ node }) => [
                {
                  id: `${LocalFilesAction.Close._tag}:${node.id}`,
                  data: async () => {
                    await dispatch?.(createIntent(LocalFilesAction.Close, { id: node.id }));
                  },
                  properties: {
                    label: ['close label', { ns: FILES_PLUGIN }],
                    icon: 'ph--x--regular',
                  },
                },
                ...(node.data.permission !== 'granted'
                  ? [
                      {
                        id: `${LocalFilesAction.Reconnect._tag}:${node.id}`,
                        data: async () => {
                          await dispatch?.(createIntent(LocalFilesAction.Reconnect, { id: node.id }));
                        },
                        properties: {
                          label: ['re-open label', { ns: FILES_PLUGIN }],
                          icon: 'ph--plugs--regular',
                          disposition: 'default',
                        },
                      },
                    ]
                  : []),
                ...(node.data.permission === 'granted' && isLocalFile(node.data)
                  ? [
                      {
                        id: `${LocalFilesAction.Save._tag}:${node.data.id}`,
                        data: async () => {
                          await dispatch?.(createIntent(LocalFilesAction.Save, { id: node.data.id }));
                        },
                        properties: {
                          label: [node.data.handle ? 'save label' : 'save as label', { ns: FILES_PLUGIN }],
                          icon: 'ph--floppy-disk--regular',
                          keyBinding: {
                            macos: 'meta+s',
                            windows: 'ctrl+s',
                          },
                        },
                      },
                    ]
                  : []),
              ],
            }),
          ];
        },
        serializer: () => [
          {
            inputType: ROOT_TYPE,
            outputType: 'text/directory',
            disposition: 'fallback',
            serialize: async () => ({
              name: 'root',
              data: 'root',
              type: 'text/directory',
            }),
            deserialize: async () => {
              // No-op.
            },
          },
        ],
      },
      intent: {
        resolvers: ({ plugins }) => [
          createResolver(LocalFilesAction.SelectRoot, async () => {
            const rootDir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
            if (rootDir) {
              settings.values.rootHandle = rootDir;
            }
          }),
          createResolver(LocalFilesAction.Export, async () => {
            const explore = resolvePlugin(plugins, parseGraphPlugin)?.provides.explore;
            if (!explore) {
              return;
            }

            if (!settings.values.rootHandle) {
              return { intents: [createIntent(SettingsAction.Open, { plugin: FILES_PLUGIN })] };
            }

            const serializers = filterPlugins(plugins, parseGraphSerializerPlugin).flatMap((plugin) =>
              plugin.provides.graph.serializer(plugins),
            );

            // TODO(wittjosiah): Export needs to include order of nodes as well.
            //   Without this order is not guaranteed to be preserved on import.
            //   This can be done by computing the relations of a node before visiting it.
            //   The inverse needs to be done on import as well,
            //   the files need to be deserialized first in order to restore the relations.
            await explore({
              visitor: async (node, path) => {
                if (isActionLike(node)) {
                  return false;
                }

                const [serializer] = serializers
                  .filter((serializer) => node.type === serializer.inputType)
                  .sort(byDisposition);
                if (!serializer && node.data !== null) {
                  return false;
                }

                const serialized = await serializer.serialize(node);
                await exportFile({ node, path: path.slice(1), serialized });
              },
            });

            state.values.lastExport = Date.now();
          }),
          createResolver(LocalFilesAction.Import, async (data) => {
            const rootDir = data.rootDir ?? (await (window as any).showDirectoryPicker({ mode: 'read' }));
            if (!rootDir) {
              return;
            }

            const serializers = filterPlugins(plugins, parseGraphSerializerPlugin).flatMap((plugin) =>
              plugin.provides.graph.serializer(plugins),
            );

            const importFile = async ({ handle, ancestors }: { handle: FileSystemHandle; ancestors: unknown[] }) => {
              const [name, ...extension] = handle.name.split('.');

              let type = getFileType(extension.join('.'));
              if (!type && handle.kind === 'directory') {
                const metadataHandle = await (handle as any).getFileHandle('.composer.json');
                if (metadataHandle) {
                  const file = await metadataHandle.getFile();
                  const metadata = JSON.parse(await file.text());
                  type = metadata.type;
                }
              } else if (!type) {
                log('unsupported file type', { name, extension });
                return;
              }
              const data = handle.kind === 'directory' ? name : await (await (handle as any).getFile()).text();
              const [serializer] = serializers
                .filter((serializer) =>
                  // For directories, the output type cannot be inferred from the file extension.
                  handle.kind === 'directory' ? type === serializer.inputType : type === serializer.outputType,
                )
                .sort(byDisposition);

              return serializer?.deserialize({ name, data, type }, ancestors);
            };

            await traverseFileSystem(rootDir, (handle, ancestors) => importFile({ handle, ancestors }));
          }),
          createResolver(LocalFilesAction.OpenFile, async () => {
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
              state.values.files.push(file);

              return { data: { id: file.id, activeParts: { main: [file.id] } } };
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,text/markdown';
            const result = new Trigger<string>();
            input.onchange = async () => {
              const [legacyFile] = input.files ? Array.from(input.files) : [];
              if (legacyFile) {
                const file = await legacyFileToLocalFile(legacyFile);
                state.values.files.push(file);
                result.wake(file.id);
              }
            };
            input.click();
            const id = await result.wait();
            return { data: { id, activeParts: { main: [id] } } };
          }),
          createResolver(LocalFilesAction.OpenDirectory, async () => {
            const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
            const directory = await handleToLocalDirectory(handle);
            state.values.files.push(directory);
            return { data: { id: directory.id, activeParts: { main: [directory.id, directory.children[0]?.id] } } };
          }),
          createResolver(LocalFilesAction.Reconnect, async (data) => {
            const entity = state.values.files.find((entity) => entity.id === data.id);
            if (!entity) {
              return;
            }

            if ('children' in entity) {
              const permission = await (entity.handle as any).requestPermission({ mode: 'readwrite' });
              if (permission === 'granted') {
                entity.children = await getDirectoryChildren(entity.handle, entity.handle.name);
                entity.permission = permission;
              }
            } else {
              const permission = await (entity.handle as any)?.requestPermission({ mode: 'readwrite' });
              if (permission === 'granted') {
                const text = await (entity.handle as any).getFile?.().then((file: any) => file.text());
                entity.text = text;
                entity.permission = permission;
              }
            }
          }),
          createResolver(LocalFilesAction.Save, async (data) => {
            const file = findFile(state.values.files, [data.id]);
            if (file) {
              await handleSave(file);
            }
          }),
          createResolver(LocalFilesAction.Close, async (data) => {
            const index = state.values.files.findIndex((f) => f.id === data.id);
            if (index >= 0) {
              state.values.files.splice(index, 1);
            }
          }),
        ],
      },
    },
  };
};

const writeFile = async (handle: FileSystemFileHandle, content: string) => {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
};

const getFileName = (node: SerializedNode, counter = 0) => {
  let extension = '';
  switch (node.type) {
    case 'application/tldraw':
      extension = '.tldraw.json';
      break;
    case 'text/markdown':
      extension = '.md';
      break;
    case 'text/directory':
    default:
      break;
  }

  const name = counter > 0 ? `${node.name} (${counter})` : node.name;
  return `${name}${extension}`;
};

const getFileType = (extension: string) => {
  switch (extension) {
    case 'tldraw.json':
      return 'application/tldraw';
    case 'md':
      return 'text/markdown';
    default:
      return undefined;
  }
};

const traverseFileSystem = async (
  handle: FileSystemDirectoryHandle,
  visitor: (handle: FileSystemHandle, path: string[]) => MaybePromise<any>,
  ancestors: any[] = [],
) => {
  for await (const entry of (handle as any).values()) {
    const result = await visitor(entry, ancestors);
    if (entry.kind === 'directory') {
      await traverseFileSystem(entry, visitor, [...ancestors, result]);
    }
  }
};

const byDisposition = (a: NodeSerializer, b: NodeSerializer) => {
  const aDisposition = a.disposition ?? 'default';
  const bDisposition = b.disposition ?? 'default';

  if (aDisposition === bDisposition) {
    return 0;
  } else if (aDisposition === 'hoist' || bDisposition === 'fallback') {
    return -1;
  } else if (bDisposition === 'hoist' || aDisposition === 'fallback') {
    return 1;
  }

  return 0;
};
