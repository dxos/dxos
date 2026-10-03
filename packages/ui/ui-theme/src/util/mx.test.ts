//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { mx } from './mx.ts';

describe('mx', () => {
  test('keeps a theme ring width beside a ring colour', ({ expect }) => {
    expect(mx('ring-focus-line ring-[var(--color-focus-ring)]')).toBe('ring-focus-line ring-[var(--color-focus-ring)]');
    expect(mx('ring-offset-focus-offset ring-offset-[var(--color-focus-ring)]')).toBe(
      'ring-offset-focus-offset ring-offset-[var(--color-focus-ring)]',
    );
  });

  test('resolves conflicting ring widths', ({ expect }) => {
    expect(mx('ring-2 ring-focus-line')).toBe('ring-focus-line');
    expect(mx('ring-focus-line ring-2')).toBe('ring-2');
  });
});
