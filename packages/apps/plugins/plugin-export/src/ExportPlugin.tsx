//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as localForage from 'localforage';

import {
  filterPlugins,
  type PluginDefinition,
  parseGraphPlugin,
  parseGraphSerializerPlugin,
  parseGraphExporterPlugin,
  resolvePlugin,
  type GraphExporterProvides,
} from '@dxos/app-framework';
import { isActionLike } from '@dxos/app-graph';
import { LocalStorageStore } from '@dxos/local-storage';

import meta, { EXPORT_PLUGIN } from './meta';

type ExportSettings = {
  rootHandle?: FileSystemDirectoryHandle;
  autoExport: boolean;
  autoExportInterval: number;
};

/**
 * Plugin for exporting data from the app graph.
 *
 * Provides a default exporter for the file system.
 */
export const ExportPlugin = (): PluginDefinition<GraphExporterProvides> => {
  const settings = new LocalStorageStore<ExportSettings>(EXPORT_PLUGIN, {
    autoExport: true,
    autoExportInterval: 30_000,
  });
  // const fileHandles: Record<string, FileSystemHandle> = {};
  const fileHandles: Record<string, any> = {};

  const subscriptions = new Set<() => void>();

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop({ key: 'autoExport', storageKey: 'auto-export', type: LocalStorageStore.bool() })
        .prop({ key: 'autoExportInterval', storageKey: 'auto-export-interval', type: LocalStorageStore.number() });

      subscriptions.add(
        effect(() => {
          const rootHandle = settings.values.rootHandle;
          if (rootHandle) {
            void localForage.setItem(`${EXPORT_PLUGIN}/rootHandle`, rootHandle);
          }
        }),
      );

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

      subscriptions.add(
        effect(() => {
          if (!settings.values.autoExport) {
            return;
          }

          let running = false;
          const interval = setInterval(async () => {
            if (running) {
              return;
            }
            running = true;

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

                const serialized = node.data === null ? node.id : await serializer.serialize(node);
                await Promise.all(exporters.map((exporter) => exporter.export({ node, path, serialized })));
              },
            });

            running = false;
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
      graph: {
        exporter: () => [
          {
            export: async ({ node, path, serialized }) => {
              const pathString = path.join('/');
              const handle = fileHandles[pathString];
              if (!handle) {
                fileHandles[pathString] = node;
              }

              const parentPath = path.slice(0, -1);
              const parentPathString = parentPath.join('/');
              const parentHandle = fileHandles[parentPathString];
              if (!parentHandle) {
                console.log('MISSING PARENT', node.id);
              }

              console.log('EXPORT', { id: node.id, serialized, path });
            },
            import: async (id) => {
              throw new Error('Not implemented');
            },
          },
        ],
      },
    },
  };
};
