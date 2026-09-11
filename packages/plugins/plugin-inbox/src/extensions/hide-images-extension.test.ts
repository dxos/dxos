//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { computeHiddenRanges } from './hide-images-extension.ts';

// Reconstructs the visible text by dropping the computed hidden ranges, mirroring what the replace
// decorations omit from the rendered output.
const applyHidden = (text: string): string => {
  let result = '';
  let position = 0;
  for (const { from, to } of computeHiddenRanges(text)) {
    result += text.slice(position, from);
    position = to;
  }
  return result + text.slice(position);
};

describe('hideImages ranges', () => {
  test('omits remote image markdown', ({ expect }) => {
    expect(applyHidden('before ![alt](https://example.com/a.png) after')).to.equal('before  after');
  });

  test('leaves local (echo:/dxn:) images untouched — preview() renders them without a fetch', ({ expect }) => {
    for (const text of ['see ![alt](echo:/1234) here', 'see ![alt](dxn:foo:1234) here']) {
      expect(applyHidden(text)).to.equal(text);
    }
  });

  test('omits non-http images that would otherwise render broken', ({ expect }) => {
    // `cid:` (inline attachment) and protocol-relative targets: neither resolves in the markdown
    // view, so both used to show as a broken image while only http(s) was hidden.
    expect(applyHidden('before ![alt](cid:signature-1) after')).to.equal('before  after');
    expect(applyHidden('before ![alt](//cdn.example.com/a.png) after')).to.equal('before  after');
    expect(applyHidden('before ![alt](data:image/png;base64,iVBORw0KGgo=) after')).to.equal('before  after');
  });

  test('omits an image with an empty target', ({ expect }) => {
    // `![alt]()` resolves to nothing, so it renders broken; hide it like any other unloadable image.
    expect(applyHidden('before ![alt]() after')).to.equal('before  after');
    expect(applyHidden('before ![alt](  ) after')).to.equal('before  after');
  });

  test('omits an image whose target carries a title', ({ expect }) => {
    expect(applyHidden('a ![alt](https://e.com/i.png "Title") b')).to.equal('a  b');
  });

  test('keep predicate overrides which targets survive', ({ expect }) => {
    const text = 'a ![x](https://e.com/i.png) b ![y](cid:1) c';
    const hide = (input: string, keep: (url: string) => boolean) => {
      let result = '';
      let position = 0;
      for (const { from, to } of computeHiddenRanges(input, keep)) {
        result += input.slice(position, from);
        position = to;
      }
      return result + input.slice(position);
    };
    // Keep everything.
    expect(hide(text, () => true)).to.equal(text);
    // Keep only cid:.
    expect(hide(text, (url) => url.startsWith('cid:'))).to.equal('a  b ![y](cid:1) c');
  });

  test('collapses multiple consecutive blank lines to a single blank line', ({ expect }) => {
    expect(applyHidden('a\n\n\n\nb')).to.equal('a\n\nb');
    expect(applyHidden('a\n\n\n\n\n\n\nb')).to.equal('a\n\nb');
  });

  test('collapses blank lines padded with horizontal whitespace', ({ expect }) => {
    expect(applyHidden('a\n \n\t\n\nb')).to.equal('a\n \nb');
  });

  test('leaves a single blank line untouched', ({ expect }) => {
    expect(applyHidden('a\n\nb')).to.equal('a\n\nb');
  });

  test('leaves a single line break untouched', ({ expect }) => {
    expect(applyHidden('a\nb')).to.equal('a\nb');
  });

  test('collapses the gap that image removal opens up to a single blank line', ({ expect }) => {
    // After the image is removed the surrounding blank lines become contiguous and collapse.
    expect(applyHidden('top\n\n![x](https://e.com/i.png)\n\nbottom')).to.equal('top\n\nbottom');
    expect(applyHidden('top\n\n\n![x](https://e.com/i.png)\n\n\nbottom')).to.equal('top\n\nbottom');
  });

  test('omits a linked remote image, leaving no empty link behind', ({ expect }) => {
    expect(applyHidden('a [![alt](https://e.com/i.png)](https://e.com/go) b')).to.equal('a  b');
  });

  test('cleans up a newsletter block of linked images', ({ expect }) => {
    const input = [
      'A Legacy of Excellence, 25 Years and Counting',
      '',
      'Exclusive anniversary offers, alfresco dining, seasonal cocktails, and more',
      '',
      '[View in browser](http://ecom.peninsula.com/tr/c/x/3373449)',
      '',
      '[![The Peninsula Chicago Hotel Logo](https://images.tcgms.net/assets/x/4fa34e3c.png)](https://ecom.peninsula.com/tr/c/x/4638372)',
      '',
      '[![Doorman opening car door and smiling](https://images.tcgms.net/assets/x/a971b8a1.jpg)](https://ecom.peninsula.com/tr/c/x/4638376)',
      '',
      'CELEBRATING 25 YEARS IN CHICAGO',
    ].join('\n');

    const expected = [
      'A Legacy of Excellence, 25 Years and Counting',
      '',
      'Exclusive anniversary offers, alfresco dining, seasonal cocktails, and more',
      '',
      '[View in browser](http://ecom.peninsula.com/tr/c/x/3373449)',
      '',
      'CELEBRATING 25 YEARS IN CHICAGO',
    ].join('\n');

    expect(applyHidden(input)).to.equal(expected);
  });
});
