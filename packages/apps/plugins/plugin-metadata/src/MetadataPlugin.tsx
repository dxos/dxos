//
// Copyright 2023 DXOS.org
//

import {
  filterPlugins,
  type MetadataResolverProvides,
  type PluginDefinition,
  parseMetadataRecordsPlugin,
  type MetadataRecordsProvides,
} from '@dxos/app-framework';
import * as E from '@dxos/echo-schema/schema';

import meta from './meta';

/**
 * Plugin for collecting and resolving type metadata.
 */
export const MetadataPlugin = (): PluginDefinition<MetadataResolverProvides> => {
  const state = E.object<MetadataRecordsProvides['metadata']>({ records: {} });

  return {
    meta,
    ready: async (plugins) => {
      filterPlugins(plugins, parseMetadataRecordsPlugin).forEach((plugin) => {
        Object.entries(plugin.provides.metadata.records).forEach(([key, value]) => {
          state.records[key] = value;
        });
      });
    },
    provides: {
      metadata: {
        resolver: (type) => state.records[type] ?? {},
      },
    },
  };
};
