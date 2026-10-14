//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { highlightJson, parseJson } from './json.ts';

const ESC = String.fromCharCode(27);
const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');

/** Drops SGR escapes, so a test can compare the text a reader sees. */
const plain = (text: string) => text.replace(SGR, '');

describe('parseJson', () => {
  test('parses an object or an array', ({ expect }) => {
    expect(parseJson('{"id": 1}')).to.deep.eq({ id: 1 });
    expect(parseJson('  [1, 2]\n')).to.deep.eq([1, 2]);
  });

  test('leaves anything else alone', ({ expect }) => {
    // Scalars are valid JSON but read as ordinary output, not structured data.
    expect(parseJson('42')).to.be.undefined;
    expect(parseJson('"text"')).to.be.undefined;
    expect(parseJson('Hello, world.')).to.be.undefined;
    expect(parseJson('{ not json }')).to.be.undefined;
  });
});

describe('highlightJson', () => {
  const value = { name: 'Ada', age: 36, admin: true, manager: null, tags: ['a: b', '-1'] };

  test('reads as the indented JSON once the colors are stripped', ({ expect }) => {
    expect(plain(highlightJson(value))).to.eq(JSON.stringify(value, null, 2));
  });

  test('colors keys, strings, numbers, booleans and null distinctly', ({ expect }) => {
    const output = highlightJson(value);
    expect(output).to.contain('\x1b[36m"name"\x1b[0m:');
    expect(output).to.contain('\x1b[32m"Ada"\x1b[0m');
    expect(output).to.contain('\x1b[33m36\x1b[0m');
    expect(output).to.contain('\x1b[35mtrue\x1b[0m');
    expect(output).to.contain('\x1b[2mnull\x1b[0m');
  });

  test('a colon or a number inside a string stays part of the string', ({ expect }) => {
    const output = highlightJson(value);
    expect(output).to.contain('\x1b[32m"a: b"\x1b[0m');
    expect(output).to.contain('\x1b[32m"-1"\x1b[0m');
  });
});
