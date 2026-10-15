//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseInline, stripComment } from './values.ts';

describe('parseInline', () => {
  test('scalars', ({ expect }) => {
    expect(parseInline('2.5')).toBe(2.5);
    expect(parseInline('-3')).toBe(-3);
    expect(parseInline('true')).toBe(true);
    expect(parseInline('null')).toBe(null);
    expect(parseInline('A message is typed: on the phone')).toBe('A message is typed: on the phone');
    expect(parseInline('"quoted, text"')).toBe('quoted, text');
  });

  test('inline maps and lists', ({ expect }) => {
    expect(parseInline('{ view: iso, focus: home/phone, zoom: 2.5, over: 2s }')).toEqual({
      view: 'iso',
      focus: 'home/phone',
      zoom: 2.5,
      over: '2s',
    });
    expect(parseInline('{ home/phone.app: chat }')).toEqual({ 'home/phone.app': 'chat' });
    expect(parseInline('{ path: [{ fit: cloud }, { focus: cloud/s2, zoom: 1.2 }], over: 5s }')).toEqual({
      path: [{ fit: 'cloud' }, { focus: 'cloud/s2', zoom: 1.2 }],
      over: '5s',
    });
    expect(parseInline("{ target: 'ring-*', stagger: 200ms }")).toEqual({ target: 'ring-*', stagger: '200ms' });
    expect(parseInline("{ color: '#5f8fae' }")).toEqual({ color: '#5f8fae' });
    expect(parseInline('[a, b, 3]')).toEqual(['a', 'b', 3]);
    expect(parseInline('{}')).toEqual({});
    expect(parseInline('[]')).toEqual([]);
  });

  test('errors carry the line', ({ expect }) => {
    expect(() => parseInline('{ view iso }', 4)).toThrow(/line 5/);
    expect(() => parseInline("{ a: 'open }")).toThrow(/Unterminated/);
    expect(() => parseInline('{ a: 1 } trailing')).toThrow(/Unexpected text/);
  });
});

describe('stripComment', () => {
  test('removes trailing comments only outside quotes', ({ expect }) => {
    expect(stripComment('zoom: 2   # close up')).toBe('zoom: 2');
    expect(stripComment("caption: it's fine # note")).toBe("caption: it's fine");
    expect(stripComment("color: '#5f8fae'")).toBe("color: '#5f8fae'");
    expect(stripComment('color: #5f8fae')).toBe('color:');
    expect(stripComment('# whole line')).toBe('');
  });
});
