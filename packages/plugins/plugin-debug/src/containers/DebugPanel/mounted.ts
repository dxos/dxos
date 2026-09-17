//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

export const mountedPanels = Atom.make(0).pipe(Atom.keepAlive);
