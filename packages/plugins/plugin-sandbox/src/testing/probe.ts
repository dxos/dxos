//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EffectEx } from '@dxos/effect';

import { LocalSandboxBackend } from '../local/LocalSandboxBackend.ts';

/**
 * Whether this host can run a local sandbox at all, decided by starting one. Having bubblewrap is not
 * enough: a container whose seccomp profile blocks user namespaces has it and still cannot use it,
 * and tests there should skip rather than fail.
 */
export const canRunLocalSandboxes = async (): Promise<boolean> => {
  const root = await mkdtemp(join(tmpdir(), 'dx-sandbox-probe-'));
  const backend = new LocalSandboxBackend({ root, path: process.env.PATH });
  try {
    const result = await EffectEx.runPromise(backend.exec('probe', 'probe', { command: 'true', timeout: 30_000 }));
    return result.success;
  } catch {
    return false;
  } finally {
    await EffectEx.runPromise(Effect.ignore(backend.close()));
    await rm(root, { recursive: true, force: true });
  }
};
