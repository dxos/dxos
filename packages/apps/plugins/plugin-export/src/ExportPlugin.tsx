//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as localForage from 'localforage';
import React from 'react';

import {
  filterPlugins,
  type PluginDefinition,
  parseGraphPlugin,
  parseGraphSerializerPlugin,
  parseGraphExporterPlugin,
  resolvePlugin,
  parseIntentPlugin,
  type SerializedNode,
} from '@dxos/app-framework';
import { isActionLike, ROOT_TYPE } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';

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

              const serializers = filterPlugins(plugins, parseGraphSerializerPlugin).flatMap((plugin) =>
                plugin.provides.graph.serializer(plugins),
              );
              const exporters = filterPlugins(plugins, parseGraphExporterPlugin).flatMap((plugin) =>
                plugin.provides.graph.exporter(plugins),
              );

              await explore({
                visitor: async (node, path) => {
                  if (isActionLike(node)) {
                    return false;
                  }

                  const [serializer] = serializers
                    .filter((serializer) => (serializer.type ? node.type === serializer.type : true))
                    .sort((a, b) => {
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
                    });
                  if (!serializer && node.data !== null) {
                    return false;
                  }

                  const serialized = await serializer.serialize(node);
                  await Promise.all(
                    exporters.map((exporter) => exporter.export({ node, path: path.slice(1), serialized })),
                  );
                },
              });
            }
          }
        },
      },
      graph: {
        serializer: () => [
          {
            type: ROOT_TYPE,
            disposition: 'fallback',
            serialize: async () => ({
              name: 'root',
              data: 'root',
              type: 'text/directory',
            }),
            deserialize: async (id, data) => {
              throw new Error('Not implemented');
            },
          },
        ],
        exporter: () =>
          settings.values.rootHandle
            ? [
                {
                  export: async ({ node, path, serialized }) => {
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
                      } else {
                        const handle = await parentHandle.getFileHandle(name, { create: true });
                        await writeFile(handle, serialized.data);
                      }
                    } catch (err) {
                      log.catch(err);
                    }
                  },
                  import: async (id) => {
                    throw new Error('Not implemented');
                  },
                },
              ]
            : [],
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
