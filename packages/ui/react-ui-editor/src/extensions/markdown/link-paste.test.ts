//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { formatUrlForDisplay } from './link-paste';

const testCases = [
  { input: 'https://www.example.com', expected: 'example.com' },
  { input: 'http://example.com', expected: 'example.com' },
  { input: 'https://example.com/', expected: 'example.com' },
  { input: 'https://www.example.com/', expected: 'example.com' },
  { input: 'https://example.com/test', expected: 'example.com/test' },
  { input: 'https://www.example.com/test', expected: 'example.com/test' },
  { input: 'http://example.com/test', expected: 'example.com/test' },
  {
    input: 'https://example.com/some/path?name=value&another_name=another_value',
    expected: 'example.com/some/path?name=value&anot...',
  },
  {
    input: 'https://www.example.com/some/path?name=value&another_name=another_value',
    expected: 'example.com/some/path?name=value&anot...',
  },
  {
    input: 'http://example.com/some/path?name=value&another_name=another_value',
    expected: 'example.com/some/path?name=value&anot...',
  },
  {
    input: 'https://www.example.com?name=value&another_name=another_value',
    expected: 'example.com?name=value&anot...',
  },
  { input: 'http://example.com?name=value&another_name=another_value', expected: 'example.com?name=value&anot...' },
  { input: 'https://example.com?name=value', expected: 'example.com?name=value' },
  { input: 'http://example.com?name=value', expected: 'example.com?name=value' },
  { input: 'https://www.example.com?name=value', expected: 'example.com?name=value' },
  { input: 'ftp://example.com', expected: 'ftp://example.com' },
];

describe('formatUrlForDisplay', () =>
  testCases.forEach(({ input, expected }) =>
    test(`formats ${input} into ${expected}`, () => expect(formatUrlForDisplay(input)).equals(expected)),
  ));
