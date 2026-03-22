//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { normalizeText } from './util';

describe('util', () => {
  test('stripNewlines', ({ expect }) => {
    const text = '<p>aaa</p><p><br></p><p><br></p><p>bbb</p>';
    expect(normalizeText(text)).to.equal('aaa\n\nbbb');
  });

  test('markdown', ({ expect }) => {
    const text =
      '<p>Another quick reminder to kindly complete this short questionnaire <a href="https://blueyard.typeform.com/to/OLmO8o4k">link</a> to indicate your preferred Day.</p>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal(
      'Another quick reminder to kindly complete this short questionnaire [link](https://blueyard.typeform.com/to/OLmO8o4k) to indicate your preferred Day.',
    );
  });

  test('strip html (full)', ({ expect }) => {
    const text = '<html><body><p>test</p></body></html>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal('test');
  });

  test('strip html', ({ expect }) => {
    const text = '<p>test</p>';
    const markdown = normalizeText(text);
    expect(markdown).to.equal('test');
  });
});
