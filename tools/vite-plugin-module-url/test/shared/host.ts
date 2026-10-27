//
// Copyright 2026 DXOS.org
//

import { token } from './state.ts';

// A worker entry: what it shares with the module it loads is `state.ts`.
(globalThis as { hostToken?: symbol }).hostToken = token;
