//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import type * as Plugin from '@dxos/app-framework/Plugin';

/**
 * Search text of the registry's plugin list, shared rather than per-article so
 * `OpenPluginRegistry` can open the list already filtered.
 */
export const registryFilterAtom = Atom.make('').pipe(Atom.keepAlive);

/**
 * Whether a plugin matches the lower-cased search `query` by its key, display name or description.
 */
export const matchesFilter = (plugin: Plugin.Plugin, query: string): boolean => {
  const { key, name, description } = plugin.meta.profile;
  return [key, name, description].some((text) => text?.toLowerCase().includes(query));
};
