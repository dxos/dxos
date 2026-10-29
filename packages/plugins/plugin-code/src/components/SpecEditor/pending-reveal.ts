//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

/**
 * An item to scroll to once the spec at `path` opens; set before opening another spec, cleared by the spec article
 * that reveals it. Kept alive since it is written before its reader mounts.
 */
export const pendingReveal: Atom.Writable<{ path: string; item: string } | undefined> = Atom.make<
  { path: string; item: string } | undefined
>(undefined).pipe(Atom.keepAlive);
