//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { xmlElementLength } from './wire';

describe('wire', () => {
  test('xmlElementLength handles hyphenated custom element names', ({ expect }) => {
    const inner = 'Hello';
    const el = `<dom-widget>${inner}</dom-widget>`;
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength handle multi-line tags', ({ expect }) => {
    const el = trim`
      <summary>
        Line 1

        Line 2
      </summary>
    `;
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength handles simple tag names', ({ expect }) => {
    const el = '<prompt>Hi</prompt>';
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength returns 0 until closing tag is complete', ({ expect }) => {
    expect(xmlElementLength('<dom-widget>x')).toBe(0);
  });

  test('xmlElementLength handles tags with blank lines in content', ({ expect }) => {
    const el = trim`
      <reasoning>
      The user is asking me to think deeply about what markdown is.

      But given the context of our conversation - we've been trying to scrape slab data from a website - I think they might be hinting at something specific.
      </reasoning>
    `;
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength handles tags with multiple blank lines', ({ expect }) => {
    const el = trim`
      <reasoning>
      First paragraph.


      Second paragraph after two blank lines.
      </reasoning>
    `;
    expect(xmlElementLength(el)).toBe(el.length);
  });

  test('xmlElementLength handles tags with only blank lines', ({ expect }) => {
    const el = '<reasoning>\n\n\n</reasoning>';
    expect(xmlElementLength(el)).toBe(el.length);
  });
});
