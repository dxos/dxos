//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { decodeInput, isQuitInput } from './input';
import { rewriteHelpAliases, tokenize } from './tokenize';

describe('decodeInput', () => {
  test('decodes printable characters', () => {
    const [input] = decodeInput('a');
    expect(input.key).to.deep.eq({ name: 'a', ctrl: false, meta: false, shift: false });
    expect(Option.getOrNull(input.input)).to.eq('a');
  });

  test('reports shift for capitals but keeps the lowercase name', () => {
    const [input] = decodeInput('A');
    expect(input.key.name).to.eq('a');
    expect(input.key.shift).to.be.true;
    expect(Option.getOrNull(input.input)).to.eq('A');
  });

  test('names the space key', () => {
    expect(decodeInput(' ')[0].key.name).to.eq('space');
  });

  test('decodes carriage return as return', () => {
    expect(decodeInput('\r')[0].key.name).to.eq('return');
  });

  test('decodes backspace', () => {
    expect(decodeInput('\x7f')[0].key.name).to.eq('backspace');
  });

  test('decodes arrow key escape sequences', () => {
    expect(decodeInput('\x1b[A')[0].key.name).to.eq('up');
    expect(decodeInput('\x1b[B')[0].key.name).to.eq('down');
    expect(decodeInput('\x1b[C')[0].key.name).to.eq('right');
    expect(decodeInput('\x1b[D')[0].key.name).to.eq('left');
  });

  test('prefers the longer escape sequence when one is a prefix of another', () => {
    expect(decodeInput('\x1b[3~')[0].key.name).to.eq('delete');
  });

  test('decodes control chords', () => {
    const [input] = decodeInput('\x03');
    expect(input.key.name).to.eq('c');
    expect(input.key.ctrl).to.be.true;
  });

  test('decodes alt-modified keys', () => {
    const [input] = decodeInput('\x1bf');
    expect(input.key.name).to.eq('f');
    expect(input.key.meta).to.be.true;
  });

  test('expands a pasted chunk into one event per character', () => {
    const inputs = decodeInput('paste');
    expect(inputs).to.have.length(5);
    expect(inputs.map((input) => Option.getOrNull(input.input)).join('')).to.eq('paste');
  });

  test('splits a mixed chunk into its constituent keys', () => {
    const inputs = decodeInput('hi\r');
    expect(inputs.map((input) => input.key.name)).to.deep.eq(['h', 'i', 'return']);
  });
});

describe('isQuitInput', () => {
  test('detects the interrupt chords', () => {
    expect(isQuitInput(decodeInput('\x03')[0])).to.be.true;
    expect(isQuitInput(decodeInput('\x04')[0])).to.be.true;
    expect(isQuitInput(decodeInput('c')[0])).to.be.false;
  });
});

describe('tokenize', () => {
  test('splits on whitespace', () => {
    expect(tokenize('space list')).to.deep.eq(['space', 'list']);
  });

  test('keeps quoted segments intact', () => {
    expect(tokenize('space create "My Space"')).to.deep.eq(['space', 'create', 'My Space']);
    expect(tokenize("greet 'ada lovelace'")).to.deep.eq(['greet', 'ada lovelace']);
  });

  test('returns nothing for blank input', () => {
    expect(tokenize('   ')).to.deep.eq([]);
  });
});

describe('rewriteHelpAliases', () => {
  test('maps a bare help alias to the top-level flag', () => {
    expect(rewriteHelpAliases(['help'])).to.deep.eq(['--help']);
    expect(rewriteHelpAliases(['?'])).to.deep.eq(['--help']);
  });

  test('moves a help alias to a trailing flag', () => {
    expect(rewriteHelpAliases(['help', 'space', 'list'])).to.deep.eq(['space', 'list', '--help']);
  });

  test('leaves other commands untouched', () => {
    expect(rewriteHelpAliases(['space', 'list'])).to.deep.eq(['space', 'list']);
    expect(rewriteHelpAliases([])).to.deep.eq([]);
  });
});
