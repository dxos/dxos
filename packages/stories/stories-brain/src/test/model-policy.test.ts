//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_MODEL_POLICY,
  type StageId,
  parseModelPolicyEnv,
  resolveModel,
  resolveModelName,
} from '../testing/harness';

// Deterministic coverage for the model-policy map — no fixture / model required.

describe('DEFAULT_MODEL_POLICY', () => {
  test('every default entry resolves to a real variant (no typos)', () => {
    for (const stage of Object.keys(DEFAULT_MODEL_POLICY) as StageId[]) {
      expect(() => resolveModel(stage), stage).not.toThrow();
    }
  });
});

describe('resolveModel', () => {
  test('resolves a stage to its default variant', () => {
    expect(resolveModel('draft').name).toBe('gemma-4-12b');
    expect(resolveModel('tag').name).toBe('claude-haiku');
  });

  test('a per-run policy overrides the default', () => {
    expect(resolveModelName('draft', { draft: 'gpt-oss-20b' })).toBe('gpt-oss-20b');
    expect(resolveModel('draft', { draft: 'gpt-oss-20b' }).name).toBe('gpt-oss-20b');
    // Unrelated stages keep their defaults.
    expect(resolveModelName('tag', { draft: 'gpt-oss-20b' })).toBe('claude-haiku');
  });

  test('the name is matched as a substring (haiku → claude-haiku)', () => {
    expect(resolveModel('tag', { tag: 'haiku' }).name).toBe('claude-haiku');
  });

  test('an unknown variant name throws loudly', () => {
    expect(() => resolveModel('draft', { draft: 'no-such-model' })).toThrow(/no variant matches/);
  });
});

describe('parseModelPolicyEnv', () => {
  test('parses stage=variant pairs', () => {
    expect(parseModelPolicyEnv('draft=gpt-oss-20b,tag=haiku')).toEqual({ draft: 'gpt-oss-20b', tag: 'haiku' });
  });

  test('ignores unknown stages and blanks', () => {
    expect(parseModelPolicyEnv('bogus=x,draft=gemma, ,')).toEqual({ draft: 'gemma' });
  });

  test('empty / undefined → empty policy', () => {
    expect(parseModelPolicyEnv('')).toEqual({});
    expect(parseModelPolicyEnv(undefined)).toEqual({});
  });
});
