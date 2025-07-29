//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from './string';

describe('string', () => {
  test('dedent', async ({ expect }) => {
    const text = trim`
      - 1
      - 2
        - 3
    `;

    expect(text).to.eq('- 1\n- 2\n  - 3\n');
  });
});
