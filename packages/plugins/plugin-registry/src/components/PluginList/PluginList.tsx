//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin, type PluginManager } from '@dxos/app-framework';
import { Listbox } from '@dxos/react-ui-list';

import { type PluginItemProps, PluginItem } from './PluginItem';

export type PluginListProps = Omit<PluginItemProps, 'plugin' | 'extraTags' | 'hasUpdate' | 'failure'> & {
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
  /**
   * Map from plugin id → most recent failure record. Used to render a warning
   * badge next to the plugin name. Sourced from `PluginManager.failed`.
   */
  failuresById?: Record<string, PluginManager.PluginFailure>;
};

export const PluginList = ({
  plugins = [],
  extraTagsById,
  updateAvailableIds,
  failuresById,
  ...props
}: PluginListProps) => {
  return (
    <Listbox.Root>
      <Listbox.Content
        aria-label='plugins'
        classNames='grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] auto-rows-[max-content] gap-4 p-4'
      >
        {plugins.map((plugin) => (
          <PluginItem
            key={plugin.meta.profile.key}
            plugin={plugin}
            extraTags={extraTagsById?.[plugin.meta.profile.key]}
            hasUpdate={updateAvailableIds?.has(plugin.meta.profile.key)}
            failure={failuresById?.[plugin.meta.profile.key]}
            {...props}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
