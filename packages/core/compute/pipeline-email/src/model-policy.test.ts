//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_MODEL_POLICY, MODEL_HAIKU, MODEL_SONNET, type StageId, resolveModel } from './model-policy';

describe('model-policy', () => {
  test('every stage has a default model', ({ expect }) => {
    for (const stage of Object.keys(DEFAULT_MODEL_POLICY) as StageId[]) {
      expect(resolveModel(stage), stage).toBe(MODEL_HAIKU);
    }
  });

  test('a per-run policy overrides the default', ({ expect }) => {
    expect(resolveModel('summarize-topic', { 'summarize-topic': MODEL_SONNET })).toBe(MODEL_SONNET);
    // Unrelated stages keep their defaults.
    expect(resolveModel('tag', { 'summarize-topic': MODEL_SONNET })).toBe(MODEL_HAIKU);
  });
});
