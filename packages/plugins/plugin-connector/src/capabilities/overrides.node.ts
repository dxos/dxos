//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Node-specific implementation spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical (empty) declaration: `connector oauth` needs a Bun callback server, so only a
// node host loads the real command graph.
export const Commands = AppCapability.commands(() => import('./commands'));
