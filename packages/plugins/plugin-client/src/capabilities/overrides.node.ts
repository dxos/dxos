//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Node-specific implementation spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declaration: `commands.node.ts` adds `account`/`profile`, which need the OAuth
// callback server and filesystem the browser command set omits.
export const Commands = AppCapability.commands(() => import('./commands.node'));
