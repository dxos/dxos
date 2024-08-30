//
// Copyright 2023 DXOS.org
//

import {
  File,
  FilePlus,
  FloppyDisk,
  Folder,
  FolderOpen,
  FolderPlus,
  Plugs,
  X,
  type IconProps,
} from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import localforage from 'localforage';
import React from 'react';

import { createExtension, isActionLike, ROOT_TYPE, type Node } from '@dxos/plugin-graph';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import {
  resolvePlugin,
  type PluginDefinition,
  parseGraphPlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  firstIdInPart,
  NavigationAction,
  type SerializedNode,
  type NodeSerializer,
  SettingsAction,
  filterPlugins,
  parseGraphSerializerPlugin,
} from '@dxos/app-framework';
import { EventSubscriptions, Trigger } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { listener } from '@dxos/react-ui-editor';
import { type MaybePromise } from '@dxos/util';

import { FilesSettings, LocalFileMain } from './components';
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
  let onFilesUpdate: ((node?: Node<LocalEntity>) => void) | undefined;
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

  const handleKeyDown = async (event: KeyboardEvent) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.key === 's' && modifier && state.values.current) {
      event.preventDefault();
      await handleSave(state.values.current);
      onFilesUpdate?.();
    }
  };

  return {
    meta,
    initialize: async () => {
      state.prop({
        key: 'lastExport',
        storageKey: 'last-export',
        type: LocalStorageStore.number({ allowUndefined: true }),
      });

      settings
        .prop({ key: 'autoExport', storageKey: 'auto-export', type: LocalStorageStore.bool() })
        .prop({ key: 'autoExportInterval', storageKey: 'auto-export-interval', type: LocalStorageStore.number() })
        .prop({
          key: 'openLocalFiles',
          storageKey: 'open-local-files',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        });

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
              onChange: (text) => {
                if (settings.values.openLocalFiles && state.values.current && state.values.current.text !== text) {
                  state.values.current.text = text.toString();
                  state.values.current.modified = true;
                  onFilesUpdate?.();
                }
              },
            }),
          ],
        },
      };
    },
    ready: async (plugins) => {
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
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
            await dispatch({ plugin: FILES_PLUGIN, action: LocalFilesAction.EXPORT });
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

          window.addEventListener('keydown', handleKeyDown);
          return () => window.removeEventListener('keydown', handleKeyDown);
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

      // Subscribe to graph to track the currently active file.
      const navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      if (navigationPlugin && graphPlugin) {
        subscriptions.add(
          effect(() => {
            if (!settings.values.openLocalFiles) {
              return;
            }

            const active = firstIdInPart(navigationPlugin.provides.location.active, 'main');
            const path =
              active && graphPlugin.provides.graph.getPath({ target: active })?.filter((id) => id.startsWith(PREFIX));
            const current = (active?.startsWith(PREFIX) && path && findFile(state.values.files, path)) || undefined;
            if (state.values.current !== current) {
              state.values.current = current;
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
      settings: settings.values,
      translations,
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isLocalFile(data.active) ? <LocalFileMain file={data.active} /> : null;
            }

            case 'settings': {
              return data.plugin === meta.id ? <FilesSettings settings={settings.values} /> : null;
            }

            case 'status': {
              return settings.values.autoExport ? (
                <ExportStatus running={state.values.exportRunning} lastExport={state.values.lastExport} />
              ) : null;
            }
          }

          return null;
        },
      },
      graph: {
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          return [
            // Create export/import actions.
            createExtension({
              id: `${FILES_PLUGIN}/export`,
              filter: (node): node is Node<null> => node.id === 'root',
              actions: () => [
                {
                  id: LocalFilesAction.EXPORT,
                  data: async () => {
                    await intentPlugin?.provides.intent.dispatch({
                      plugin: FILES_PLUGIN,
                      action: LocalFilesAction.EXPORT,
                    });
                  },
                  properties: {
                    label: ['export label', { ns: FILES_PLUGIN }],
                    icon: (props: IconProps) => <FloppyDisk {...props} />,
                    iconSymbol: 'ph--floppy-disk--regular',
                  },
                },
                {
                  id: LocalFilesAction.IMPORT,
                  data: async () => {
                    await intentPlugin?.provides.intent.dispatch({
                      plugin: FILES_PLUGIN,
                      action: LocalFilesAction.IMPORT,
                    });
                  },
                  properties: {
                    label: ['import label', { ns: FILES_PLUGIN }],
                    icon: (props: IconProps) => <FolderOpen {...props} />,
                    iconSymbol: 'ph--folder-open--regular',
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
                          palette: 'yellow',
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
                  id: 'open-file-handle',
                  data: async () => {
                    await intentPlugin?.provides.intent.dispatch([
                      {
                        plugin: FILES_PLUGIN,
                        action: LocalFilesAction.OPEN_FILE,
                      },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['open file label', { ns: FILES_PLUGIN }],
                    icon: (props: IconProps) => <FilePlus {...props} />,
                    iconSymbol: 'ph--file-plus--regular',
                  },
                },
                ...('showDirectoryPicker' in window
                  ? [
                      {
                        id: 'open-directory',
                        data: async () => {
                          await intentPlugin?.provides.intent.dispatch([
                            {
                              plugin: FILES_PLUGIN,
                              action: LocalFilesAction.OPEN_DIRECTORY,
                            },
                            { action: NavigationAction.OPEN },
                          ]);
                        },
                        properties: {
                          label: ['open directory label', { ns: FILES_PLUGIN }],
                          icon: (props: IconProps) => <FolderPlus {...props} />,
                          iconSymbol: 'ph--folder-plus--regular',
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
                    label: entity.title,
                    icon: (props: IconProps) => ('children' in entity ? <Folder {...props} /> : <File {...props} />),
                    iconSymbol: 'children' in entity ? 'ph--folder--regular' : 'ph--file--regular',
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
                    label: child.title,
                    icon: (props: IconProps) => <File {...props} />,
                    iconSymbol: 'ph--file--regular',
                  },
                })),
            }),

            // Create file actions.
            createExtension({
              id: `${FILES_PLUGIN}/actions`,
              filter: (node): node is Node<LocalEntity> => isLocalEntity(node.data),
              actions: ({ node }) => [
                {
                  id: `${LocalFilesAction.CLOSE}:${node.id}`,
                  data: async () => {
                    await intentPlugin?.provides.intent.dispatch({
                      plugin: FILES_PLUGIN,
                      action: LocalFilesAction.CLOSE,
                      data: { id: node.id },
                    });
                  },
                  properties: {
                    label: ['close label', { ns: FILES_PLUGIN }],
                    icon: (props: IconProps) => <X {...props} />,
                    iconSymbol: 'ph--x--regular',
                  },
                },
                ...(node.data.permission !== 'granted'
                  ? [
                      {
                        id: `${LocalFilesAction.RECONNECT}:${node.id}`,
                        data: async () => {
                          await intentPlugin?.provides.intent.dispatch({
                            plugin: FILES_PLUGIN,
                            action: LocalFilesAction.RECONNECT,
                            data: { id: node.id },
                          });
                        },
                        properties: {
                          label: ['re-open label', { ns: FILES_PLUGIN }],
                          icon: (props: IconProps) => <Plugs {...props} />,
                          iconSymbol: 'ph--plugs--regular',
                          disposition: 'default',
                        },
                      },
                    ]
                  : []),
                ...(node.data.permission === 'granted' && isLocalFile(node.data)
                  ? [
                      {
                        id: `${LocalFilesAction.SAVE}:${node.data.id}`,
                        data: async () => {
                          await intentPlugin?.provides.intent.dispatch({
                            plugin: FILES_PLUGIN,
                            action: LocalFilesAction.SAVE,
                            data: { id: node.data.id },
                          });
                        },
                        properties: {
                          label: [node.data.handle ? 'save label' : 'save as label', { ns: FILES_PLUGIN }],
                          icon: (props: IconProps) => <FloppyDisk {...props} />,
                          iconSymbol: 'ph--floppy-disk--regular',
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
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            case LocalFilesAction.SELECT_ROOT: {
              const rootDir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              if (rootDir) {
                settings.values.rootHandle = rootDir;
                return { data: true };
              }
              return { data: false };
            }

            case LocalFilesAction.EXPORT: {
              const explore = resolvePlugin(plugins, parseGraphPlugin)?.provides.explore;
              if (!explore) {
                return;
              }

              if (!settings.values.rootHandle) {
                return {
                  data: false,
                  intents: [[{ action: SettingsAction.OPEN, data: { plugin: FILES_PLUGIN } }]],
                };
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

              return { data: true };
            }

            case LocalFilesAction.IMPORT: {
              const rootDir =
                intent.data?.intent.rootDir ?? (await (window as any).showDirectoryPicker({ mode: 'read' }));
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
              return { data: true };
            }

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
                state.values.files.push(file);

                return { data: { activeParts: { main: [file.id] } } };
              }

              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.md,text/markdown';
              const result = new Trigger<string[]>();
              input.onchange = async () => {
                const [legacyFile] = input.files ? Array.from(input.files) : [];
                if (legacyFile) {
                  const file = await legacyFileToLocalFile(legacyFile);
                  state.values.files.push(file);
                  result.wake([file.id]);
                }
              };
              input.click();
              return { data: await result };
            }

            case LocalFilesAction.OPEN_DIRECTORY: {
              const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              const directory = await handleToLocalDirectory(handle);
              state.values.files.push(directory);
              return { data: { activeParts: { main: [directory.id, directory.children[0]?.id] } } };
            }

            case LocalFilesAction.RECONNECT: {
              const entity = state.values.files.find((entity) => entity.id === intent.data?.id);
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
              const file = findFile(state.values.files, intent.data?.id);
              if (file) {
                await handleSave(file);
                onFilesUpdate?.();
                return { data: true };
              }
              break;
            }

            case LocalFilesAction.CLOSE: {
              if (typeof intent.data?.id === 'string') {
                const index = state.values.files.findIndex((f) => f.id === intent.data?.id);
                if (index >= 0) {
                  state.values.files.splice(index, 1);
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
