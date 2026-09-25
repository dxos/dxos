//
// Copyright 2026 DXOS.org
//

// A page holding nothing, for the baseline.

import { measure } from './common.ts';

Reflect.set(globalThis, 'load', async () => measure(0));
