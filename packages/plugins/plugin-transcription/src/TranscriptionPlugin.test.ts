//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TranscriptionPlugin } from './TranscriptionPlugin';

describe('TranscriptionPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(TranscriptionPlugin.meta).toBeDefined();
    expect(TranscriptionPlugin.meta.id).toBeTypeOf('string');
  });
});
