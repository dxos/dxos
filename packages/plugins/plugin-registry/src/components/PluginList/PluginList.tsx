//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { List } from '@dxos/react-ui';

import { PluginItem, type PluginItemProps } from './PluginItem';

export type PluginListProps = Omit<PluginItemProps, 'plugin' | 'extraTags' | 'hasUpdate'> & {
  plugins?: readonly Plugin.Plugin[];
  /**
   * Map from plugin id → extra tags to display (e.g. `registry`, `local`).
   * Computed by the container; not persisted to plugin meta.
   */
  extraTagsById?: Record<string, readonly string[]>;
  /**
   * Set of plugin ids for which a newer version is available in the catalog.
   * Causes each matching item to render an Update button instead of the enable switch.
   */
  updateAvailableIds?: ReadonlySet<string>;
};

export const PluginList = ({ plugins = [], extraTagsById, updateAvailableIds, ...props }: PluginListProps) => {
  return (
    <List classNames='grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] auto-rows-[max-content] gap-4 p-4'>
      {plugins.map((plugin) => (
        <PluginItem
          key={plugin.meta.id}
          plugin={plugin}
          extraTags={extraTagsById?.[plugin.meta.id]}
          hasUpdate={updateAvailableIds?.has(plugin.meta.id)}
          {...props}
        />
      ))}
    </List>
  );
};
