//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';

export type PluginPredicate = (plugin: Plugin.Plugin) => boolean;

/** Quality tiers surfaced in `recommended`; an untagged plugin is excluded rather than assumed ready. */
const RECOMMENDED_TIERS: readonly string[] = ['beta', 'alpha'];

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
    case 'bundled':
      return ({ meta }) => !core.includes(meta.profile.key) && !remoteIds.has(meta.profile.key);
    case 'installed':
      return ({ meta }) => !core.includes(meta.profile.key) && enabled.includes(meta.profile.key);
    case 'recommended':
      return ({ meta }) =>
        !core.includes(meta.profile.key) &&
        !remoteIds.has(meta.profile.key) &&
        (meta.profile.tags?.some((tag) => RECOMMENDED_TIERS.includes(tag)) ?? false);
    case 'labs':
      return ({ meta }) => meta.profile.tags?.includes('labs') ?? false;
    default:
      return () => false;
  }
};

/** Set of plugin ids known to originate from a remote URL (not bundled). */
export const getRemotePluginIds = (): ReadonlySet<string> =>
  new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
