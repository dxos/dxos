//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { type Plugin, type PluginManager, type Registry, UrlLoader } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { useNode } from '@dxos/plugin-graph';

import { PluginDetail } from '#components';
import { getPluginPath, getPluginSpecPath } from '#meta';

import { useDisableConfirmation, useRegistryPluginProvider, useRegistryPlugins, useRemotePluginIds } from '../../hooks';

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
      onEnabledChange={actions.handleEnableChange}
      onInstall={!isInstalled && moduleUrl ? actions.handleInstall : undefined}
      onInstallVersion={pickerVersions.length > 0 ? actions.handleInstallVersion : undefined}
      onNavigateToPlugin={handleNavigateToPlugin}
      onOpenSpec={actions.handleOpenSpec}
      onResolvePluginName={handleResolvePluginName}
      onUninstall={canUninstall ? actions.handleUninstall : undefined}
      onUpdate={hasUpdate ? actions.handleUpdate : undefined}
      onVersionChange={setSelectedVersionTag}
    />
  );
};

//
// Hooks
//

// Each of the hooks below isolates a self-contained slice of the article's
// state machine. They're declared at module scope (rather than inline in
// `PluginArticle`) to keep the component readable as a thin wiring layer over
// `PluginDetail`.
//

/**
 * Resolves the registry catalog entry for a plugin by id, plus the two fields
 * (`moduleUrl`, `repo`) the rest of the article cares about.
 */
const useCatalogEntry = (
  pluginId: string,
): {
  catalogEntry: Registry.Plugin | undefined;
  moduleUrl: string | undefined;
  repo: string | undefined;
} => {
  const { entries } = useRegistryPlugins();
  const catalogEntry = useMemo(() => entries.find((entry) => entry.id === pluginId), [entries, pluginId]);
  return { catalogEntry, moduleUrl: catalogEntry?.moduleUrl, repo: catalogEntry?.repo };
};

/**
 * Tracks the per-plugin installed version (sourced from `UrlLoader` localStorage)
 * as React state so post-install/update re-renders are deterministic — the value
 * lives in component state rather than being read inline on every render.
 *
 * - Initialised from localStorage at mount.
 * - Auto-resyncs when the plugin manager's plugin list changes (catches external
 *   installs / removes triggered by the list view).
 * - `syncInstalledVersion()` is the explicit handle install/update operations
 *   call inside their `Effect.ensuring` so the post-mutation render sees both
 *   the new version and the cleared `installing`/`updating` flag together.
 */
const useInstalledVersionTag = (
  pluginId: string,
  plugins: readonly Plugin.Plugin[],
): {
  installedVersionTag: string | undefined;
  syncInstalledVersion: () => void;
} => {
  const [installedVersionTag, setInstalledVersionTag] = useState<string | undefined>(() =>
    UrlLoader.getInstalledVersion(pluginId),
  );

  const syncInstalledVersion = useCallback(() => {
    setInstalledVersionTag(UrlLoader.getInstalledVersion(pluginId));
  }, [pluginId]);

  useEffect(() => {
    syncInstalledVersion();
  }, [plugins, syncInstalledVersion]);

  return { installedVersionTag, syncInstalledVersion };
};

/**
 * Owns the version picker's state machine: fetches the available versions list
 * from the provider, prepends the installed version when the catalog stub omits
 * it, and keeps the selection clamped to whatever's currently in the list (so
 * an external update doesn't strand the trigger on a tag that's no longer
 * available).
 */
const useVersionPicker = ({
  provider,
  pluginId,
  repo,
  moduleUrl,
  installedVersionTag,
}: {
  provider: Registry.Manager;
  pluginId: string;
  repo: string | undefined;
  moduleUrl: string | undefined;
  installedVersionTag: string | undefined;
}): {
  pickerVersions: readonly Registry.PluginVersion[];
  selectedVersionTag: string | undefined;
  setSelectedVersionTag: Dispatch<SetStateAction<string | undefined>>;
} => {
  const [versions, setVersions] = useState<readonly Registry.PluginVersion[]>([]);
  const [selectedVersionTag, setSelectedVersionTag] = useState<string | undefined>();

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
          const installedVersion = UrlLoader.getInstalledVersion(pluginId);
          setSelectedVersionTag(installedVersion ?? vs[0]?.tag);
        },
        onFailure: () => {
          // Non-critical; version picker stays empty.
        },
      }),
      runAndForwardErrors,
    );
  }, [provider, repo, pluginId]);

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

  return { pickerVersions, selectedVersionTag, setSelectedVersionTag };
};

type PluginActionsProps = {
  manager: PluginManager.PluginManager;
  pluginId: string;
  isInstalled: boolean;
  moduleUrl: string | undefined;
  catalogEntry: Registry.Plugin | undefined;
  pickerVersions: readonly Registry.PluginVersion[];
  selectedVersionTag: string | undefined;
  syncInstalledVersion: () => void;
};

type PluginActions = {
  installing: boolean;
  updating: boolean;
  handleEnableChange: (enabled: boolean) => void;
  handleUninstall: () => void;
  handleInstall: () => void;
  handleUpdate: () => void;
  handleInstallVersion: () => void;
  handleOpenSpec?: () => void;
};

/**
 * The user-facing actions the article exposes — enable/disable, uninstall,
 * install (latest), update (to latest catalog version), and install-from-picker —
 * plus the `installing`/`updating` flags they drive. Each handler ends with a
 * `syncInstalledVersion()` call inside its `Effect.ensuring` so the cached
 * installed version snaps to the freshly-written localStorage value in the same
 * render that clears the in-flight flag.
 */
const usePluginActions = ({
  manager,
  pluginId,
  isInstalled,
  moduleUrl,
  catalogEntry,
  pickerVersions,
  selectedVersionTag,
  syncInstalledVersion,
}: PluginActionsProps): PluginActions => {
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();

  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const requestDisable = useDisableConfirmation(manager, (id) => void runAndForwardErrors(manager.disable(id)));

  // The spec child node is contributed by whatever plugin can render MDL (e.g., plugin-code).
  // When that plugin isn't enabled, the node is absent and the "View specification" button stays hidden.
  const specPath = getPluginSpecPath(pluginId);
  const hasSpecNode = !!useNode(graph, specPath);
  const handleOpenSpec = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [specPath] });
  }, [invokePromise, specPath]);

  const handleEnableChange = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        void runAndForwardErrors(manager.enable(pluginId));
        return;
      }

      requestDisable(pluginId);
    },
    [manager, pluginId, requestDisable],
  );

  const handleUninstall = useCallback(() => {
    void runAndForwardErrors(manager.remove(pluginId));
  }, [manager, pluginId]);

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

  const handleUpdate = useCallback(() => {
    if (!moduleUrl || !catalogEntry) {
      return;
    }

    setUpdating(true);
    void Effect.gen(function* () {
      yield* manager.remove(pluginId);
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
  }, [manager, pluginId, moduleUrl, catalogEntry, syncInstalledVersion]);

  const handleInstallVersion = useCallback(() => {
    const version = pickerVersions.find((candidate) => candidate.tag === selectedVersionTag);
    if (!version || !version.moduleUrl) {
      return;
    }

    setInstalling(true);
    void Effect.gen(function* () {
      // Remove existing version before installing a different one.
      if (isInstalled) {
        yield* manager.remove(pluginId);
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
  }, [manager, pluginId, isInstalled, selectedVersionTag, pickerVersions, syncInstalledVersion]);

  return {
    installing,
    updating,
    handleEnableChange,
    handleUninstall,
    handleInstall,
    handleUpdate,
    handleInstallVersion,
    handleOpenSpec: hasSpecNode ? handleOpenSpec : undefined,
  };
};
