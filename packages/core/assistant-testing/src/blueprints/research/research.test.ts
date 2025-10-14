//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';

Test.describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Research Blueprint', { timeout: 120_000 }, () => {});
