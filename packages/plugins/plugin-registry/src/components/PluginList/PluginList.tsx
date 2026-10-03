//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type * as Plugin from '@dxos/app-framework/Plugin';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
import * as Container from '@dxos/react-ui/Container';

import { PluginItem, type PluginItemProps } from './PluginItem.tsx';

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
  /** Ids whose value on this device differs from the account's. */
  deviceOnlyIds?: ReadonlySet<string>;
};

export const PluginList = ({
  plugins = [],
  extraTagsById,
  updateAvailableIds,
  failuresById,
  deviceOnlyIds,
  ...props
}: PluginListProps) => {
  return (
    <Container.Container
      layout='row'
      columns='repeat(auto-fill, minmax(18rem, 1fr))'
      gap='lg'
      align='stretch'
      role='list'
      aria-label='plugins'
    >
      {plugins.map((plugin) => (
        <PluginItem
          key={plugin.meta.profile.key}
          plugin={plugin}
          extraTags={extraTagsById?.[plugin.meta.profile.key]}
          hasUpdate={updateAvailableIds?.has(plugin.meta.profile.key)}
          failure={failuresById?.[plugin.meta.profile.key]}
          deviceOnly={deviceOnlyIds?.has(plugin.meta.profile.key)}
          {...props}
        />
      ))}
    </Container.Container>
  );
};
