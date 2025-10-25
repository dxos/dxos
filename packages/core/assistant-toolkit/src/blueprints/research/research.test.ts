//
// Copyright 2025 DXOS.org
//

import { describe } from '@effect/vitest';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Research Blueprint', { timeout: 120_000 }, () => {});
