//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { trim } from '@dxos/util';

import { getFallbackName } from './util';

describe('markdown utils', () => {
  it('getFallbackName', () => {
    const tests = [
      {
        content: '',
        expected: '',
      },
      {
        content: trim`
          ![img](https://dxos.network/dxos-logotype-blue.png)

          # Welcome to Composer by DXOS

          ## What is Composer?
        `,
        expected: 'Welcome to Composer by DXOS',
      },
      {
        content: trim`
          ![img](https://dxos.network/dxos-logotype-blue.png)

          ---

          This document is about the decetralized platform DXOS.
        `,
        expected: 'This document is about the…',
      },
    ];

    tests.forEach(({ content, expected }) => {
      expect(getFallbackName(content)).toBe(expected);
    });
  });
});
