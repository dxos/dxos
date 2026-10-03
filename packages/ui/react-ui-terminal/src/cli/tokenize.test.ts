//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { rewriteHelpAliases, tokenize } from './tokenize.ts';

describe('tokenize', () => {
  test('splits on whitespace', ({ expect }) => {
    expect(tokenize('space list')).to.deep.eq(['space', 'list']);
  });

  test('keeps quoted segments intact', ({ expect }) => {
    expect(tokenize('space create "My Space"')).to.deep.eq(['space', 'create', 'My Space']);
    expect(tokenize("greet 'ada lovelace'")).to.deep.eq(['greet', 'ada lovelace']);
  });

  test('returns nothing for blank input', ({ expect }) => {
    expect(tokenize('   ')).to.deep.eq([]);
  });
});

describe('rewriteHelpAliases', () => {
  test('maps a bare help alias to the top-level flag', ({ expect }) => {
    expect(rewriteHelpAliases(['help'])).to.deep.eq(['--help']);
    expect(rewriteHelpAliases(['?'])).to.deep.eq(['--help']);
  });

  test('moves a help alias to a trailing flag', ({ expect }) => {
    expect(rewriteHelpAliases(['help', 'space', 'list'])).to.deep.eq(['space', 'list', '--help']);
  });

  test('leaves other commands untouched', ({ expect }) => {
    expect(rewriteHelpAliases(['space', 'list'])).to.deep.eq(['space', 'list']);
    expect(rewriteHelpAliases([])).to.deep.eq([]);
  });
});
