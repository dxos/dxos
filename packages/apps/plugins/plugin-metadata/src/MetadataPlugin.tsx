//
// Copyright 2023 DXOS.org
//

import { deepSignal, shallow } from 'deepsignal/react';

import {
  filterPlugins,
  type MetadataResolverProvides,
  type PluginDefinition,
  parseMetadataRecordsPlugin,
  type MetadataRecordsProvides,
} from '@dxos/app-framework';

import meta from './meta';

/**
 * Plugin for collecting and resolving type metadata.
 */
export const MetadataPlugin = (): PluginDefinition<MetadataResolverProvides> => {
  const state = deepSignal<MetadataRecordsProvides['metadata']>({ records: {} });

  return {
    meta,
    ready: async (plugins) => {
      filterPlugins(plugins, parseMetadataRecordsPlugin).forEach((plugin) => {
        Object.entries(plugin.provides.metadata.records).forEach(([key, value]) => {
          state.records[key] = shallow(value);
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
