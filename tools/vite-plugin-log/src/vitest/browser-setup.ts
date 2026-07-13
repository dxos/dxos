//
// Copyright 2026 DXOS.org
//

import { afterAll } from 'vitest';

import { httpTransport, installRuntime } from '../runtime-core.ts';

// Browser vitest realms have no filesystem, so `@dxos/log` entries are POSTed to the dev-server
// sink mounted by `DxosLogPlugin` (see `vitest.base.config.ts`). Worker realms are wired
// separately via the plugin's worker-entry injection; this only covers the main test window.
const runtime = installRuntime(httpTransport);

// Flush any buffered lines before the browser realm is torn down.
afterAll(() => runtime.flush());
