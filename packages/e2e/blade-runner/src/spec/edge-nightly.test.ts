//
// Copyright 2026 DXOS.org
//

import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { readSpecFile } from '../plan/index.ts';
import { EdgeJoinLatency } from './edge-join-latency/index.ts';
import { EdgeStress } from './edge-stress/index.ts';

const CONFIG = fileURLToPath(new URL('../../configs/edge-nightly.yml', import.meta.url));

// The nightly runs only at 02:00 against a shared environment, so a malformed config must fail here instead.
describe('configs/edge-nightly.yml', () => {
  test('edgeJoinLatency decodes to a complete spec', async () => {
    const spec = new EdgeJoinLatency().decodeSpec(await readSpecFile(CONFIG, 'edgeJoinLatency'));
    expect(spec.edge).toBe('preview');
    expect(spec.cleanup).toBe(true);
  });

  test('edgeStress decodes to a complete spec', async () => {
    const spec = new EdgeStress().decodeSpec(await readSpecFile(CONFIG, 'edgeStress'));
    expect(spec.edge).toBe('preview');
    expect(spec.plan).toBeUndefined();
  });

  test('a missing field is rejected rather than defaulted', async () => {
    const { joiners: _joiners, ...rest } = new EdgeJoinLatency().decodeSpec(
      await readSpecFile(CONFIG, 'edgeJoinLatency'),
    );
    expect(() => new EdgeJoinLatency().decodeSpec(rest)).toThrow(/joiners/);
  });

  test('an unknown field is rejected', async () => {
    const spec = new EdgeStress().decodeSpec(await readSpecFile(CONFIG, 'edgeStress'));
    expect(() => new EdgeStress().decodeSpec({ ...spec, maxComands: 1 })).toThrow(/maxComands/);
  });

  test('an unknown section is rejected', async () => {
    await expect(readSpecFile(CONFIG, 'edgeSoak')).rejects.toThrow(/edgeSoak/);
  });
});
