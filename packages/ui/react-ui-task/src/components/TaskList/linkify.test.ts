//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { linkifyText } from './linkify';

describe('linkifyText', () => {
  test('text with no url is one run', ({ expect }) => {
    expect(linkifyText('Review the branch')).to.deep.eq([{ text: 'Review the branch' }]);
  });

  test('empty text is no runs', ({ expect }) => {
    expect(linkifyText('')).to.deep.eq([]);
  });

  test('a url is split out of the text around it', ({ expect }) => {
    expect(linkifyText('Review https://github.com/dxos/dxos/pull/12924')).to.deep.eq([
      { text: 'Review ' },
      { text: 'https://github.com/dxos/dxos/pull/12924', href: 'https://github.com/dxos/dxos/pull/12924' },
    ]);
  });

  test('text following a url is kept', ({ expect }) => {
    expect(linkifyText('see http://dxos.org now')).to.deep.eq([
      { text: 'see ' },
      { text: 'http://dxos.org', href: 'http://dxos.org' },
      { text: ' now' },
    ]);
  });

  test('every url in the text is linked', ({ expect }) => {
    expect(linkifyText('https://a.com and https://b.com')).to.deep.eq([
      { text: 'https://a.com', href: 'https://a.com' },
      { text: ' and ' },
      { text: 'https://b.com', href: 'https://b.com' },
    ]);
  });

  test('sentence punctuation is left outside the link', ({ expect }) => {
    expect(linkifyText('Fixed by https://dxos.org/pr/1.')).to.deep.eq([
      { text: 'Fixed by ' },
      { text: 'https://dxos.org/pr/1', href: 'https://dxos.org/pr/1' },
      { text: '.' },
    ]);
  });

  test('an unmatched closing bracket is the sentence, not the url', ({ expect }) => {
    expect(linkifyText('(see https://dxos.org)')).to.deep.eq([
      { text: '(see ' },
      { text: 'https://dxos.org', href: 'https://dxos.org' },
      { text: ')' },
    ]);
  });

  test('a matched closing bracket stays in the url', ({ expect }) => {
    expect(linkifyText('https://en.wikipedia.org/wiki/Bun_(software)')).to.deep.eq([
      { text: 'https://en.wikipedia.org/wiki/Bun_(software)', href: 'https://en.wikipedia.org/wiki/Bun_(software)' },
    ]);
  });

  test('a scheme other than http(s) is not a link', ({ expect }) => {
    expect(linkifyText('run javascript:alert(1)')).to.deep.eq([{ text: 'run javascript:alert(1)' }]);
  });

  test('a scheme with no host is not a link', ({ expect }) => {
    expect(linkifyText('go to https://?next now')).to.deep.eq([{ text: 'go to https://?next now' }]);
  });

  test('a rejected candidate between two links stays text', ({ expect }) => {
    expect(linkifyText('https://a.com https://?x https://b.com')).to.deep.eq([
      { text: 'https://a.com', href: 'https://a.com' },
      { text: ' https://?x ' },
      { text: 'https://b.com', href: 'https://b.com' },
    ]);
  });

  test('a schemeless host is not a link', ({ expect }) => {
    expect(linkifyText('deploy to dxos.org today')).to.deep.eq([{ text: 'deploy to dxos.org today' }]);
  });
});
