//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SpaceDigest } from '../../replicants/client-replicant.ts';
import { canonical } from '../edge-stress/index.ts';
import { measureJoiner } from './plan.ts';

const DIGEST: SpaceDigest = { docs: {} };

describe('measureJoiner', () => {
  test('a join that never returns fails the joiner within its budget', async ({ expect }) => {
    const began = Date.now();
    const measurement = measureJoiner({
      joiner: 0,
      objects: 1,
      joinTimeoutMs: 50,
      expected: canonical(DIGEST),
      join: () => new Promise(() => {}),
      digest: async () => DIGEST,
    });
    await expect(measurement).rejects.toThrow(/joinSpace did not return within 50ms/);
    expect(Date.now() - began).toBeLessThan(1_000);
  });

  test('a digest that never returns fails the joiner within its budget', async ({ expect }) => {
    const measurement = measureJoiner({
      joiner: 0,
      objects: 1,
      joinTimeoutMs: 50,
      expected: canonical(DIGEST),
      join: async () => ({ admittedMs: 1, spaceReadyMs: 1 }),
      digest: () => new Promise(() => {}),
    });
    await expect(measurement).rejects.toThrow(/digest did not return within 50ms/);
  });

  test('a joiner whose digest matches is measured', async ({ expect }) => {
    const measurement = await measureJoiner({
      joiner: 2,
      objects: 4,
      joinTimeoutMs: 1_000,
      expected: canonical(DIGEST),
      join: async () => ({ admittedMs: 10, spaceReadyMs: 20 }),
      digest: async () => DIGEST,
    });
    expect(measurement).toMatchObject({ joiner: 2, ok: true, admittedMs: 10, spaceReadyMs: 20 });
    expect(measurement.syncedMs).toBeGreaterThanOrEqual(30);
  });
});
