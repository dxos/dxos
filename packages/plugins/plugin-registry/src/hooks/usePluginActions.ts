//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useState } from 'react';

import { type Plugin, type PluginManager, UrlLoader } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { EffectEx } from '@dxos/effect';
import { useNode } from '@dxos/plugin-graph';

import { getPluginPath, getPluginSpecPath } from '#meta';

import { useDisableConfirmation } from './useDisableConfirmation';

export type PluginActionsProps = {
  manager: PluginManager.PluginManager;
  pluginId: string;
  isInstalled: boolean;
  moduleUrl: string | undefined;
  catalogEntry: Plugin.Meta | undefined;
  pickerVersions: readonly Plugin.Release[];
  selectedVersionTag: string | undefined;
  syncInstalledVersion: () => void;
};

export type PluginActions = {
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
 *
 * `handleOpenSpec` is included only when a `spec` child graph node exists for
 * this plugin — contributed by whichever plugin can render MDL (today
 * `plugin-code`). When that contributor isn't enabled, the action is absent
 * and the detail view hides its "Open Specification" chip.
 */
export const usePluginActions = ({
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
  const requestDisable = useDisableConfirmation(
    manager,
    (id) => void EffectEx.runAndForwardErrors(manager.disable(id)),
  );

  const specPath = getPluginSpecPath(pluginId);
  const hasSpecNode = !!useNode(graph, specPath);
  const handleOpenSpec = useCallback(() => {
    // Open the spec beside this plugin's plank (a card navigation), never replacing it.
    void invokePromise(LayoutOperation.Open, {
      subject: [specPath],
      pivotId: getPluginPath(pluginId),
      disposition: 'add',
    });
  }, [invokePromise, specPath, pluginId]);

  const handleEnableChange = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        void EffectEx.runAndForwardErrors(manager.enable(pluginId));
        return;
      }

      requestDisable(pluginId);
    },
    [manager, pluginId, requestDisable],
  );

  const handleUninstall = useCallback(() => {
    void EffectEx.runAndForwardErrors(manager.remove(pluginId));
  }, [manager, pluginId]);

  const handleInstall = useCallback(() => {
    if (!moduleUrl) {
      return;
    }

    setInstalling(true);
    void Effect.gen(function* () {
      const added = yield* manager.add(moduleUrl);
      yield* manager.enable(added.meta.profile.key);
      if (catalogEntry?.release?.version) {
        UrlLoader.setInstalledVersion(added.meta.profile.key, catalogEntry.release.version);
      }
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setInstalling(false);
          syncInstalledVersion();
        }),
      ),
      EffectEx.runAndForwardErrors,
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
      yield* manager.enable(added.meta.profile.key);
      if (catalogEntry.release?.version) {
        UrlLoader.setInstalledVersion(added.meta.profile.key, catalogEntry.release.version);
      }
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setUpdating(false);
          syncInstalledVersion();
        }),
      ),
      EffectEx.runAndForwardErrors,
    );
  }, [manager, pluginId, moduleUrl, catalogEntry, syncInstalledVersion]);

  const handleInstallVersion = useCallback(() => {
    const version = pickerVersions.find((candidate) => candidate.version === selectedVersionTag);
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
      yield* manager.enable(added.meta.profile.key);
      UrlLoader.setInstalledVersion(added.meta.profile.key, version.version);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          setInstalling(false);
          syncInstalledVersion();
        }),
      ),
      EffectEx.runAndForwardErrors,
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
