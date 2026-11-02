//
// Copyright 2026 DXOS.org
//

import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { decodeEdgeStressSpec } from './plan.ts';

const NIGHTLY = new URL('../../../configs/edge-stress-nightly.yml', import.meta.url);

const readNightly = (): unknown => yaml.load(readFileSync(NIGHTLY, 'utf8'));

// The nightly runs only at 02:00 against a shared environment, so a malformed spec must fail here instead.
describe('configs/edge-stress-nightly.yml', () => {
  test('decodes to a complete spec', () => {
    const spec = decodeEdgeStressSpec(readNightly());
    expect(spec.edge).toBe('preview');
    expect(spec.plan).toBeUndefined();
  });

  test('a missing field is rejected rather than defaulted', () => {
    const { maxCommands: _maxCommands, ...rest } = decodeEdgeStressSpec(readNightly());
    expect(() => decodeEdgeStressSpec(rest)).toThrow(/maxCommands/);
  });

  test('an unknown field is rejected', () => {
    const spec = decodeEdgeStressSpec(readNightly());
    expect(() => decodeEdgeStressSpec({ ...spec, maxComands: 1 })).toThrow(/maxComands/);
  });
});
