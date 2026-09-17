//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

/** How many debug panels are mounted; each host mounts the panel only while it is shown. */
export const mountedPanels = Atom.make(0).pipe(Atom.keepAlive);
