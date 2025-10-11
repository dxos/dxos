//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { createUrl, stripWhitespace, toMarkdown } from './util';

describe('util', () => {
  test('createUrl', ({ expect }) => {
    const url = createUrl(['https://example.com', 'foo', undefined, 'bar'], { q: 'test' }).toString();
    expect(url).to.equal('https://example.com/foo/bar?q=test');
  });

  test('stripNewlines', ({ expect }) => {
    const text = 'aaa\n \n \n \n\n \nbbb';
    expect(stripWhitespace(text)).to.equal('aaa\n\nbbb');
  });

  test('markdown', ({ expect }) => {
    const text =
      'Another quick reminder to kindly complete this short questionnaire <https://blueyard.typeform.com/to/OLmO8o4k> to indicate your preferred Day.';
    const markdown = toMarkdown(text);
    expect(markdown).to.equal(
      'Another quick reminder to kindly complete this short questionnaire to indicate your preferred Day.',
    );
  });

  test('signature', ({ expect }) => {
    const text = trim`
      --
      CITRIN COOPERMAN

      Yaakov Maline
      Director

      212.832.0400 | 212.331.7472 (Direct) | 212.371.1159 (Fax)
      50 Rockefeller Plaza, New York, NY 10020 ymaline@citrincooperman.com <mailto:ymaline@citrincooperman.com>
    `;

    expect(text).to.equal({
      name: 'Yaakov Maline',
      org: 'CITRIN COOPERMAN',
      phone: '212.832.0400',
    });
  });
});
