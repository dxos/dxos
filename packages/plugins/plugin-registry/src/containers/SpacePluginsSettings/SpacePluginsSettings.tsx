//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Space } from '@dxos/client/echo';

import { type SpacePluginRow, SpacePluginsPanel } from '#components';

/**
 * Which plugins a space runs.
 *
 * The space's own choice, replicated to every member rather than across one user's devices, and the
 * scope Composer's EDGE services prefer when they run an operation in the space (spec D-78). While the
 * space names nothing its members each run their own set, which is what the reset returns it to.
 *
 * Core plugins are left out for the reason the account-wide list leaves them out: the host
 * force-enables them, so they are nobody's to toggle.
 *
 * Reached from the space's settings section, so the space comes from context rather than surface data.
 */
export const SpacePluginsSettings = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <PluginsSettings space={space} />;
};

const PluginsSettings = ({ space }: { space: Space }) => {
  const manager = PluginManagerProvider.usePluginManager();
  const { decisions, scoped, setEnabled, reset } = ToolkitHooks.useSpacePlugins(space);

  const plugins = useMemo<SpacePluginRow[]>(() => {
    const core = manager.getCore();
    return manager
      .getPlugins()
      .filter((plugin) => !core.includes(plugin.meta.profile.key))
      .map((plugin) => ({
        key: plugin.meta.profile.key,
        name: plugin.meta.profile.name ?? plugin.meta.profile.key,
        description: plugin.meta.profile.description,
        enabled: decisions[plugin.meta.profile.key] === true,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [manager, decisions]);

  const handleChange = useCallback((key: string, enabled: boolean) => setEnabled(key, enabled), [setEnabled]);

  return <SpacePluginsPanel plugins={plugins} scoped={scoped} onChange={handleChange} onReset={reset} />;
};

SpacePluginsSettings.displayName = 'SpacePluginsSettings';
