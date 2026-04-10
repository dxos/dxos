//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { xmlElementLength } from './wire';

describe('wire', () => {
  test('xmlElementLength handles hyphenated custom element names', ({ expect }) => {
    const inner = 'Hello';
    const el = `<dom-widget>${inner}</dom-widget>`;
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength handles simple tag names', ({ expect }) => {
    const el = '<prompt>Hi</prompt>';
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength returns 0 until closing tag is complete', ({ expect }) => {
    expect(xmlElementLength('<dom-widget>x')).toBe(0);
  });
});
