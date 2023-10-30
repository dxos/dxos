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

/**
 *
 */
export const MetadataPlugin = (): PluginDefinition<MetadataResolverProvides> => {
  const state = deepSignal<MetadataRecordsProvides['metadata']>({ records: {} });

  return {
    meta: {
      id: 'dxos.org/plugin/metadata',
    },
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
