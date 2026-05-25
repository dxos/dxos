//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';

import { PluginDetail } from '#components';
import { getPluginPath } from '#meta';

import {
  useCatalogEntry,
  useInstalledVersionTag,
  usePluginActions,
  useRegistryPluginProvider,
  useRemotePluginIds,
  useVersionPicker,
} from '../../hooks';

export type PluginArticleProps = { subject: Plugin.Plugin };

export const PluginArticle = ({ subject: plugin }: PluginArticleProps) => {
  const pluginId = plugin.meta.id;
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const remotePluginIds = useRemotePluginIds();
  const provider = useRegistryPluginProvider();
  const { invokePromise } = useOperationInvoker();

  const { catalogEntry, moduleUrl, repo } = useCatalogEntry(pluginId);
  const { installedVersionTag, syncInstalledVersion } = useInstalledVersionTag(pluginId, plugins);
  const { pickerVersions, selectedVersionTag, setSelectedVersionTag } = useVersionPicker({
    provider,
    pluginId,
    repo,
    moduleUrl,
    installedVersionTag,
  });

  const enabled = manager.getEnabled().includes(pluginId);
  const failed = useAtomValue(manager.failed);
  const failure = useMemo(() => failed.find((entry) => entry.id === pluginId), [failed, pluginId]);
  const isInstalled = useMemo(() => plugins.some((candidate) => candidate.meta.id === pluginId), [plugins, pluginId]);
  const isCore = manager.getCore().includes(pluginId);
  const canUninstall = isInstalled && !isCore && remotePluginIds.has(pluginId);
  const hasUpdate =
    isInstalled && !!catalogEntry && !!installedVersionTag && installedVersionTag !== catalogEntry.version;

  // Recompute graph slices whenever the plugin list changes, so installs /
  // removals through other surfaces (or this article's own actions) keep the
  // detail view in sync.
  const dependencies = useMemo(
    () => manager.getDependencies(pluginId, { transitive: false }),
    [manager, pluginId, plugins],
  );
  const dependents = useMemo(
    () => manager.getDependents(pluginId, { transitive: false }),
    [manager, pluginId, plugins],
  );

  // Resolves a plugin id to its display name. A plugin's translations are
  // only loaded when it is activated, so the always-available `meta.name`
  // from the registered plugin set is the right source for chip labels.
  const handleResolvePluginName = useCallback(
    (id: string): string => plugins.find((candidate) => candidate.meta.id === id)?.meta.name ?? id,
    [plugins],
  );

  const handleNavigateToPlugin = useCallback(
    (targetId: string) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [getPluginPath(targetId)],
      });
    },
    [invokePromise],
  );

  const actions = usePluginActions({
    manager,
    pluginId,
    isInstalled,
    moduleUrl,
    catalogEntry,
    pickerVersions,
    selectedVersionTag,
    syncInstalledVersion,
  });

  return (
    <PluginDetail
      plugin={plugin}
      enabled={enabled}
      installing={actions.installing}
      updating={actions.updating}
      hasUpdate={hasUpdate}
      installedVersionTag={installedVersionTag}
      selectedVersionTag={selectedVersionTag}
      versions={pickerVersions}
      dependencies={dependencies}
      dependents={dependents}
      failure={failure}
      onOpenSpec={actions.handleOpenSpec}
      onEnabledChange={actions.handleEnableChange}
      onInstall={!isInstalled && moduleUrl ? actions.handleInstall : undefined}
      onInstallVersion={pickerVersions.length > 0 ? actions.handleInstallVersion : undefined}
      onNavigateToPlugin={handleNavigateToPlugin}
      onResolvePluginName={handleResolvePluginName}
      onUninstall={canUninstall ? actions.handleUninstall : undefined}
      onUpdate={hasUpdate ? actions.handleUpdate : undefined}
      onVersionChange={setSelectedVersionTag}
    />
  );
};
