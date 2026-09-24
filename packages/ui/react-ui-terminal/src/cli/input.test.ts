//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { decodeInput, isQuitInput } from './input.ts';

describe('decodeInput', () => {
  test('decodes printable characters', ({ expect }) => {
    const [input] = decodeInput('a');
    expect(input.key).to.deep.eq({ name: 'a', ctrl: false, meta: false, shift: false });
    expect(Option.getOrNull(input.input)).to.eq('a');
  });

  test('reports shift for capitals but keeps the lowercase name', ({ expect }) => {
    const [input] = decodeInput('A');
    expect(input.key.name).to.eq('a');
    expect(input.key.shift).to.be.true;
    expect(Option.getOrNull(input.input)).to.eq('A');
  });

  test('names the space key', ({ expect }) => {
    expect(decodeInput(' ')[0].key.name).to.eq('space');
  });

  test('decodes carriage return as return', ({ expect }) => {
    expect(decodeInput('\r')[0].key.name).to.eq('return');
  });

  test('decodes backspace', ({ expect }) => {
    expect(decodeInput('\x7f')[0].key.name).to.eq('backspace');
  });

  test('decodes arrow key escape sequences', ({ expect }) => {
    expect(decodeInput('\x1b[A')[0].key.name).to.eq('up');
    expect(decodeInput('\x1b[B')[0].key.name).to.eq('down');
    expect(decodeInput('\x1b[C')[0].key.name).to.eq('right');
    expect(decodeInput('\x1b[D')[0].key.name).to.eq('left');
  });

  test('prefers the longer escape sequence when one is a prefix of another', ({ expect }) => {
    expect(decodeInput('\x1b[3~')[0].key.name).to.eq('delete');
  });

  test('decodes control chords', ({ expect }) => {
    const [input] = decodeInput('\x03');
    expect(input.key.name).to.eq('c');
    expect(input.key.ctrl).to.be.true;
  });

  test('decodes alt-modified keys', ({ expect }) => {
    const [input] = decodeInput('\x1bf');
    expect(input.key.name).to.eq('f');
    expect(input.key.meta).to.be.true;
  });

  test('expands a pasted chunk into one event per character', ({ expect }) => {
    const inputs = decodeInput('paste');
    expect(inputs).to.have.length(5);
    expect(inputs.map((input) => Option.getOrNull(input.input)).join('')).to.eq('paste');
  });

  test('splits a mixed chunk into its constituent keys', ({ expect }) => {
    const inputs = decodeInput('hi\r');
    expect(inputs.map((input) => input.key.name)).to.deep.eq(['h', 'i', 'return']);
  });

  test('discards parameterized sequences rather than decoding their parameters', ({ expect }) => {
    // Ctrl-right; the editor has no word motion, and the old decoder typed `1;5C` into the line.
    expect(decodeInput('\x1b[1;5C')).to.deep.eq([]);
    expect(decodeInput('\x1b[1;2D')).to.deep.eq([]);
    // An unrecognized SS3 sequence (F1) goes the same way.
    expect(decodeInput('\x1bOP')).to.deep.eq([]);
  });

  test('keeps decoding after an unrecognized sequence', ({ expect }) => {
    const inputs = decodeInput('\x1b[1;5Cls');
    expect(inputs.map(({ key }) => key.name)).to.deep.eq(['l', 's']);
  });
});

describe('isQuitInput', () => {
  test('detects the interrupt chords', ({ expect }) => {
    expect(isQuitInput(decodeInput('\x03')[0])).to.be.true;
    expect(isQuitInput(decodeInput('\x04')[0])).to.be.true;
    expect(isQuitInput(decodeInput('c')[0])).to.be.false;
  });
});
