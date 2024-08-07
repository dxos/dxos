//
// Copyright 2023 DXOS.org
//

import { FloppyDisk, FolderOpen, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import * as localForage from 'localforage';
import React from 'react';

import {
  filterPlugins,
  type PluginDefinition,
  parseGraphPlugin,
  parseGraphSerializerPlugin,
  resolvePlugin,
  parseIntentPlugin,
  type SerializedNode,
  type NodeSerializer,
  SettingsAction,
} from '@dxos/app-framework';
import { createExtension, isActionLike, type Node, ROOT_TYPE } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { ExportSettings } from './components';
import meta, { EXPORT_PLUGIN } from './meta';
import translations from './translations';
import { ExportAction, type ExportPluginProvides, type ExportSettingsProps } from './types';

/**
 * Plugin for exporting data from the app graph.
 *
 * Provides a default exporter for the file system.
 */
export const ExportPlugin = (): PluginDefinition<ExportPluginProvides> => {
  const settings = new LocalStorageStore<ExportSettingsProps>(EXPORT_PLUGIN, {
    autoExport: false,
    autoExportInterval: 30_000,
  });
  const state = create<{ running: boolean }>({ running: false });
  const directoryHandles: Record<string, FileSystemDirectoryHandle> = {};
  const directoryNameCounter: Record<string, Record<string, number>> = {};
  const subscriptions = new Set<() => void>();

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
    ready: async (plugins) => {
      settings
        .prop({ key: 'autoExport', storageKey: 'auto-export', type: LocalStorageStore.bool() })
        .prop({ key: 'autoExportInterval', storageKey: 'auto-export-interval', type: LocalStorageStore.number() });

      settings.values.rootHandle = (await localForage.getItem(`${EXPORT_PLUGIN}/rootHandle`)) ?? undefined;

      subscriptions.add(
        effect(() => {
          const rootHandle = settings.values.rootHandle;
          if (rootHandle) {
            void localForage.setItem(`${EXPORT_PLUGIN}/rootHandle`, rootHandle);
          }
        }),
      );

      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
      if (!dispatch) {
        return;
      }

      subscriptions.add(
        effect(() => {
          if (!settings.values.autoExport) {
            return;
          }

          const interval = setInterval(async () => {
            if (state.running) {
              return;
            }

            state.running = true;
            await dispatch({ plugin: EXPORT_PLUGIN, action: ExportAction.EXPORT });
            state.running = false;
          }, settings.values.autoExportInterval);

          return () => clearInterval(interval);
        }),
      );
    },
    unload: async () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.clear();
    },
    provides: {
      export: state,
      settings: settings.values,
      translations,
      surface: {
        // TODO(wittjosiah): Add status bar icon for auto export state.
        component: ({ data, role }) => {
          switch (role) {
            case 'settings': {
              return data.plugin === meta.id ? <ExportSettings settings={settings.values} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            case ExportAction.SELECT_ROOT: {
              const rootDir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
              if (rootDir) {
                settings.values.rootHandle = rootDir;
                return { data: true };
              }
              return { data: false };
            }

            case ExportAction.EXPORT: {
              const explore = resolvePlugin(plugins, parseGraphPlugin)?.provides.explore;
              if (!explore) {
                return;
              }

              if (!settings.values.rootHandle) {
                return {
                  data: false,
                  intents: [[{ action: SettingsAction.OPEN, data: { plugin: EXPORT_PLUGIN } }]],
                };
              }

              const serializers = filterPlugins(plugins, parseGraphSerializerPlugin).flatMap((plugin) =>
                plugin.provides.graph.serializer(plugins),
              );

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
              return { data: true };
            }

            case ExportAction.IMPORT: {
              const rootDir =
                intent.data?.intent.rootDir ?? (await (window as any).showDirectoryPicker({ mode: 'readwrite' }));
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
          }
        },
      },
      graph: {
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          return createExtension({
            id: EXPORT_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: ExportAction.EXPORT,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: EXPORT_PLUGIN,
                    action: ExportAction.EXPORT,
                  });
                },
                properties: {
                  label: ['export label', { ns: EXPORT_PLUGIN }],
                  icon: (props: IconProps) => <FloppyDisk {...props} />,
                  iconSymbol: 'ph--floppy-disk--regular',
                },
              },
              {
                id: ExportAction.IMPORT,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: EXPORT_PLUGIN,
                    action: ExportAction.IMPORT,
                  });
                },
                properties: {
                  label: ['import label', { ns: EXPORT_PLUGIN }],
                  icon: (props: IconProps) => <FolderOpen {...props} />,
                  iconSymbol: 'ph--folder-open--regular',
                },
              },
            ],
          });
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
    case 'application/json':
      extension = '.json';
      break;
    case 'text/csv':
      extension = '.csv';
      break;
    case 'text/html':
      extension = '.html';
      break;
    case 'text/plain':
      extension = '.txt';
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
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'html':
      return 'text/html';
    case 'txt':
      return 'text/plain';
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
