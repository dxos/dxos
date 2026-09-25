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

export type RegistryCategory = {
  id: string;
  labelKey: string;
  icon: string;
  testId: string;
};

export const REGISTRY_CATEGORIES: readonly RegistryCategory[] = [
  {
    id: 'bundled',
    labelKey: 'bundled-plugins.label',
    icon: 'ph--squares-four--regular',
    testId: 'pluginRegistry.bundled',
  },
  {
    id: 'installed',
    labelKey: 'installed-plugins.label',
    icon: 'ph--check--regular',
    testId: 'pluginRegistry.installed',
  },
  {
    id: 'recommended',
    labelKey: 'recommended-plugins.label',
    icon: 'ph--star--regular',
    testId: 'pluginRegistry.recommended',
  },
  {
    id: 'labs',
    labelKey: 'labs-plugins.label',
    icon: 'ph--flask--regular',
    testId: 'pluginRegistry.labs',
  },
  {
    id: 'registry',
    labelKey: 'registry-plugins.label',
    icon: 'ph--users-three--regular',
    testId: 'pluginRegistry.registry',
  },
];

export const getPopulatedCategories = (
  count: (category: string) => number,
): readonly (RegistryCategory & { count: number })[] =>
  REGISTRY_CATEGORIES.map((category) => ({ ...category, count: count(category.id) })).filter(({ count }) => count > 0);

/** Set of plugin ids known to originate from a remote URL (not bundled). */
export const getRemotePluginIds = (): ReadonlySet<string> =>
  new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
