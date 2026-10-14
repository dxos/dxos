//
// Copyright 2026 DXOS.org
//

import { type RunOptions } from './run.ts';

/**
 * The run options an entry point takes from its environment: `DEUS_TRACE`, `DEUS_PROFILE`,
 * `DEUS_MAX_STEPS` and `DEUS_JIT=0`.
 */
export const optionsFromEnv = (env: Record<string, string | undefined>): Pick<RunOptions, 'machine' | 'jit'> => ({
  machine: {
    trace: Boolean(env.DEUS_TRACE),
    profile: Boolean(env.DEUS_PROFILE),
    maxSteps: env.DEUS_MAX_STEPS ? Number(env.DEUS_MAX_STEPS) : Infinity,
  },
  jit: env.DEUS_JIT !== '0',
});
