//
// Copyright 2026 DXOS.org
//

import { type Plugin, UrlLoader } from '@dxos/app-framework';

import { registryCategoryId } from './meta';

export type PluginPredicate = (plugin: Plugin.Plugin) => boolean;

export type CategoryFilterContext = {
  /** Core (bundled-by-default) plugin ids. */
  core: readonly string[];
  /** Enabled plugin ids. */
  enabled: readonly string[];
  /** Plugin ids loaded from a remote URL (not bundled). */
  remoteIds: ReadonlySet<string>;
};

/**
 * Predicate selecting the plugins shown in a registry category, computed against the live plugin list.
 * The `registry` category is sourced from the catalog rather than the local plugin list and is not handled here.
 */
export const getCategoryPredicate = (
  category: string,
  { core, enabled, remoteIds }: CategoryFilterContext,
): PluginPredicate => {
  switch (category) {
    case registryCategoryId('bundled'):
      return ({ meta }) => !core.includes(meta.profile.key) && !remoteIds.has(meta.profile.key);
    case registryCategoryId('installed'):
      return ({ meta }) => !core.includes(meta.profile.key) && enabled.includes(meta.profile.key);
    case registryCategoryId('recommended'):
      return ({ meta }) =>
        !core.includes(meta.profile.key) && !remoteIds.has(meta.profile.key) && !meta.profile.tags?.includes('labs');
    case registryCategoryId('labs'):
      return ({ meta }) => meta.profile.tags?.includes('labs') ?? false;
    default:
      return () => false;
  }
};

/** Set of plugin ids known to originate from a remote URL (not bundled). */
export const getRemotePluginIds = (): ReadonlySet<string> =>
  new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
