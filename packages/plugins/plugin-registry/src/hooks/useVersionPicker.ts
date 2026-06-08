//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { type Registry, UrlLoader } from '@dxos/app-framework';
import { EffectEx } from '@dxos/effect';

/**
 * Owns the version picker's state machine: fetches the available versions list
 * from the provider, prepends the installed version when the catalog stub omits
 * it, and keeps the selection clamped to whatever's currently in the list (so
 * an external update doesn't strand the trigger on a tag that's no longer
 * available).
 */
export const useVersionPicker = ({
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

  // Load version list once the catalog entry's repo is known. Reset state
  // when `repo` is absent or the fetch fails so a previous plugin's
  // versions don't leak into the picker for the current plugin. The
  // `cancelled` flag guards against a stale in-flight `listVersions`
  // response overwriting the newer state after `repo`/`pluginId` changes.
  useEffect(() => {
    if (!repo) {
      setVersions([]);
      setSelectedVersionTag(undefined);
      return;
    }
    // Clear stale picker state before fetching so the UI doesn't display the
    // previous plugin's versions/selection while `listVersions` is pending.
    setVersions([]);
    setSelectedVersionTag(undefined);
    let cancelled = false;
    void provider.listVersions(repo).pipe(
      Effect.match({
        onSuccess: (vs) => {
          if (cancelled) {
            return;
          }
          setVersions(vs);
          // Default selection: the currently installed version, or the latest.
          const installedVersion = UrlLoader.getInstalledVersion(pluginId);
          setSelectedVersionTag(installedVersion ?? vs[0]?.tag);
        },
        onFailure: () => {
          if (cancelled) {
            return;
          }
          setVersions([]);
          setSelectedVersionTag(undefined);
        },
      }),
      EffectEx.runAndForwardErrors,
    );
    return () => {
      cancelled = true;
    };
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
