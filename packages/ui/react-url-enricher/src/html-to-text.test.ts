//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { htmlToText } from './html-to-text';

describe('htmlToText', () => {
  test('strips tags and collapses whitespace', ({ expect }) => {
    expect(htmlToText('<p>hello   <b>world</b></p>')).toBe('hello world');
  });

  test('removes script, style, and noscript contents', ({ expect }) => {
    expect(htmlToText('a<script>alert(1)</script>b')).toBe('a b');
    expect(htmlToText('a<style>.x{}</style>b')).toBe('a b');
    expect(htmlToText('a<noscript>fallback</noscript>b')).toBe('a b');
  });

  test('decodes common HTML entities', ({ expect }) => {
    expect(htmlToText('Tom&nbsp;&amp;&nbsp;Jerry')).toBe('Tom & Jerry');
    expect(htmlToText('&lt;x&gt; &quot;hi&quot; &#39;yo&#39;')).toBe('<x> "hi" \'yo\'');
  });
});
