//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

/**
 * Search text of the registry's plugin list, shared rather than per-article so
 * `OpenPluginRegistry` can open the list already filtered.
 */
export const registryFilterAtom = Atom.make('').pipe(Atom.keepAlive);
