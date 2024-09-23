//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { createLinkLabel } from './changes';

const testCases = [
  { input: 'https://www.example.com', expected: 'example.com' },
  { input: 'http://example.com', expected: 'example.com' },
  { input: 'https://example.com/', expected: 'example.com' },
  { input: 'https://www.example.com/', expected: 'example.com' },
  { input: 'https://example.com/test', expected: 'example.com/test' },
  { input: 'https://www.example.com/test', expected: 'example.com/test' },
  { input: 'https://example.com?name=value', expected: 'example.com' },
  { input: 'ftp://example.com', expected: 'ftp://example.com' },
];

describe('changes', () => {
  test('createLinkLabel', () => {
    testCases.forEach(({ input, expected }) => {
      expect(createLinkLabel(new URL(input))).to.eq(expected);
    });
  });
});
