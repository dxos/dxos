//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { type Registry, UrlLoader } from '@dxos/app-framework';
import { EffectEx } from '@dxos/effect';

/**
 * Owns the version picker's state machine: fetches the available versions list
 * from the provider (served from the inlined `releases` array on each entry —
 * no separate endpoint needed) and keeps the selection clamped to whatever's
 * currently in the list so an external update doesn't strand the trigger on a
 * tag that's no longer available.
 */
export const useVersionPicker = ({
  provider,
  pluginId,
  moduleUrl,
  installedVersionTag,
}: {
  provider: Registry.Manager;
  pluginId: string;
  moduleUrl: string | undefined;
  installedVersionTag: string | undefined;
}): {
  pickerVersions: readonly Registry.PluginVersion[];
  selectedVersionTag: string | undefined;
  setSelectedVersionTag: Dispatch<SetStateAction<string | undefined>>;
} => {
  const [versions, setVersions] = useState<readonly Registry.PluginVersion[]>([]);
  const [selectedVersionTag, setSelectedVersionTag] = useState<string | undefined>();

  // Load version list whenever pluginId changes. The `cancelled` flag guards
  // against a stale in-flight response overwriting newer state when the user
  // navigates between plugins quickly.
  useEffect(() => {
    setVersions([]);
    setSelectedVersionTag(undefined);
    if (!pluginId) {
      return;
    }
    let cancelled = false;
    void provider.listVersions(pluginId).pipe(
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
  }, [provider, pluginId]);

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
