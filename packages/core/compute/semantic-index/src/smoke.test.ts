//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SemanticIndexError } from './errors';

describe('semantic-index scaffold', () => {
  test('package imports', ({ expect }) => {
    const error = new SemanticIndexError({ message: 'x' });
    expect(error).toBeInstanceOf(SemanticIndexError);
    expect(error._tag).toBe('SemanticIndexError');
  });
});
