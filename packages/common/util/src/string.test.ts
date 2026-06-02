//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { inline, trim } from './string';

describe('string', () => {
  test('dedent', async ({ expect }) => {
    const text = trim`
      - 1
      - 2
        - 3
    `;

    expect(text).to.eq('- 1\n- 2\n  - 3');
  });

  test('inline collapses whitespace to single spaces', async ({ expect }) => {
    const classes = inline`
      rounded-xs outline-none text-end
      data-[type=year]:min-w-[4ch]
      data-[focused]:bg-accent-bg  data-[focused]:text-accent-fg
    `;

    expect(classes).to.eq(
      'rounded-xs outline-none text-end data-[type=year]:min-w-[4ch] data-[focused]:bg-accent-bg data-[focused]:text-accent-fg',
    );
  });

  test('inline interpolates values', async ({ expect }) => {
    const variant = 'data-[focused]:bg-accent-bg';
    const classes = inline`
      rounded-xs
      ${variant}
      outline-none
    `;

    expect(classes).to.eq('rounded-xs data-[focused]:bg-accent-bg outline-none');
  });
});
