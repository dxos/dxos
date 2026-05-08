//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type Registry, type Plugin, UrlLoader } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';

import { PluginDetail } from '#components';

import { useRegistryPluginProvider, useRegistryPlugins, useRemotePluginIds } from '../../hooks';

// TODO(burdon): Convert to ECHO type.
export type PluginArticleProps = { subject: Plugin.Plugin };

export const PluginArticle = ({ subject: plugin }: PluginArticleProps) => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  const { entries } = useRegistryPlugins();
  const provider = useRegistryPluginProvider();
  const remotePluginIds = useRemotePluginIds();
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [versions, setVersions] = useState<readonly Registry.PluginVersion[]>([]);
  const [selectedVersionTag, setSelectedVersionTag] = useState<string | undefined>();
  // `installedVersionTag` lives in component state (rather than being read inline from
  // localStorage on each render) so post-update re-renders are deterministic — we
  // explicitly resync it after each install/update operation, and keep it in step
  // with the manager.plugins atom so external installs (e.g. from the list view)
  // are picked up too.
  const [installedVersionTag, setInstalledVersionTag] = useState<string | undefined>(() =>
    UrlLoader.getInstalledVersion(plugin.meta.id),
  );

  const enabled = manager.getEnabled().includes(plugin.meta.id);
  const isInstalled = useMemo(
    () => plugins.some((candidate) => candidate.meta.id === plugin.meta.id),
    [plugins, plugin.meta.id],
  );
  const isCore = manager.getCore().includes(plugin.meta.id);
  const canUninstall = isInstalled && !isCore && remotePluginIds.has(plugin.meta.id);

  const catalogEntry = useMemo(
    () => entries.find((entry) => entry.id === plugin.meta.id),
    [entries, plugin.meta.id],
  );
  const moduleUrl = catalogEntry?.moduleUrl;
  const repo = catalogEntry?.repo;

  // Load version list once the catalog entry's repo is known.
  useEffect(() => {
    if (!repo) {
      return;
    }
    void provider.listVersions(repo).pipe(
      Effect.match({
        onSuccess: (vs) => {
          setVersions(vs);
          // Default selection: the currently installed version, or the latest.
          const installedVersion = UrlLoader.getInstalledVersion(plugin.meta.id);
          setSelectedVersionTag(installedVersion ?? vs[0]?.tag);
        },
        onFailure: () => {
          // Non-critical; version picker stays empty.
        },
      }),
      runAndForwardErrors,
    );
  }, [provider, repo, plugin.meta.id]);

  const handleEnableChange = useCallback(
    (enabled: boolean) =>
      enabled
        ? runAndForwardErrors(manager.enable(plugin.meta.id))
        : runAndForwardErrors(manager.disable(plugin.meta.id)),
    [manager, plugin.meta.id],
  );

  const handleUninstall = useCallback(() => {
    void runAndForwardErrors(manager.remove(plugin.meta.id));
  }, [manager, plugin.meta.id]);

  // Resync the cached installed version from localStorage. Called from each
  // install/update operation's ensuring callback, plus an effect tied to
  // `plugins` so external state changes (manager add/remove triggered by the
  // list view) propagate.
  const syncInstalledVersion = useCallback(() => {
    setInstalledVersionTag(UrlLoader.getInstalledVersion(plugin.meta.id));
  }, [plugin.meta.id]);

  useEffect(() => {
    syncInstalledVersion();
  }, [plugins, syncInstalledVersion]);

  const handleInstall = useCallback(() => {
    if (!moduleUrl) {
      return;
    }
    setInstalling(true);
    void Effect.gen(function* () {
      const added = yield* manager.add(moduleUrl);
      yield* manager.enable(added.meta.id);
      if (catalogEntry) {
        UrlLoader.setInstalledVersion(added.meta.id, catalogEntry.version);
      }
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setInstalling(false);
          syncInstalledVersion();
        }),
      ),
      runAndForwardErrors,
    );
  }, [manager, moduleUrl, catalogEntry, syncInstalledVersion]);

  const hasUpdate = isInstalled && !!catalogEntry && !!installedVersionTag && installedVersionTag !== catalogEntry.version;

  const handleUpdate = useCallback(() => {
    if (!moduleUrl || !catalogEntry) {
      return;
    }
    setUpdating(true);
    void Effect.gen(function* () {
      yield* manager.remove(plugin.meta.id);
      const added = yield* manager.add(moduleUrl);
      yield* manager.enable(added.meta.id);
      UrlLoader.setInstalledVersion(added.meta.id, catalogEntry.version);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setUpdating(false);
          syncInstalledVersion();
        }),
      ),
      runAndForwardErrors,
    );
  }, [manager, plugin.meta.id, moduleUrl, catalogEntry, syncInstalledVersion]);

  // Make sure the picker always lists the installed version, even if the catalog
  // hasn't surfaced it (the current `listVersions` stub only returns latest).
  const pickerVersions = useMemo<readonly Registry.PluginVersion[]>(() => {
    if (!installedVersionTag) {
      return versions;
    }
    if (versions.some((entry) => entry.tag === installedVersionTag)) {
      return versions;
    }
    const installedEntry: Registry.PluginVersion = {
      tag: installedVersionTag,
      // Picker won't be re-installing this entry unless the user selects + clicks Install,
      // and the catalog moduleUrl is the closest stand-in we have.
      moduleUrl: moduleUrl ?? '',
    };
    return [installedEntry, ...versions];
  }, [versions, installedVersionTag, moduleUrl]);

  // Keep `selectedVersionTag` in sync when picker contents change (e.g. the user
  // updated the plugin from the list view — installed version moved, picker
  // shrunk, prior selection is no longer in the list).
  useEffect(() => {
    if (pickerVersions.length === 0) {
      return;
    }
    if (selectedVersionTag && pickerVersions.some((entry) => entry.tag === selectedVersionTag)) {
      return;
    }
    setSelectedVersionTag(installedVersionTag ?? pickerVersions[0]?.tag);
  }, [pickerVersions, selectedVersionTag, installedVersionTag]);

  const handleInstallVersion = useCallback(() => {
    const version = pickerVersions.find((candidate) => candidate.tag === selectedVersionTag);
    if (!version || !version.moduleUrl) {
      return;
    }
    setInstalling(true);
    void Effect.gen(function* () {
      // Remove existing version before installing a different one.
      if (isInstalled) {
        yield* manager.remove(plugin.meta.id);
      }
      const added = yield* manager.add(version.moduleUrl);
      yield* manager.enable(added.meta.id);
      UrlLoader.setInstalledVersion(added.meta.id, version.tag);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setInstalling(false);
          syncInstalledVersion();
        }),
      ),
      runAndForwardErrors,
    );
  }, [manager, plugin.meta.id, isInstalled, selectedVersionTag, pickerVersions, syncInstalledVersion]);

  return (
    <PluginDetail
      plugin={plugin}
      enabled={enabled}
      onEnabledChange={handleEnableChange}
      onInstall={!isInstalled && moduleUrl ? handleInstall : undefined}
      installing={installing}
      onUpdate={hasUpdate ? handleUpdate : undefined}
      hasUpdate={hasUpdate}
      updating={updating}
      onUninstall={canUninstall ? handleUninstall : undefined}
      versions={pickerVersions}
      selectedVersionTag={selectedVersionTag}
      onVersionChange={setSelectedVersionTag}
      onInstallVersion={pickerVersions.length > 0 ? handleInstallVersion : undefined}
      installedVersionTag={installedVersionTag}
    />
  );
};
