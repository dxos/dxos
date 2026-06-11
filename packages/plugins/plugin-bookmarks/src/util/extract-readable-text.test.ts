//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractReadableText } from './extract-readable-text';

describe('extractReadableText', () => {
  test('strips script, style, and noscript blocks', ({ expect }) => {
    const html = `
      <html><head>
        <style>body { color: red; }</style>
        <script type="text/javascript">var hidden = 'secret';</script>
      </head><body>
        <noscript>Enable JS</noscript>
        <p>Visible text.</p>
      </body></html>
    `;
    const text = extractReadableText(html);
    expect(text).toBe('Visible text.');
  });

  test('removes tags but keeps their text content', ({ expect }) => {
    const text = extractReadableText('<h1>Title</h1><p>Some <strong>bold</strong> words.</p>');
    expect(text).toBe('Title Some bold words.');
  });

  test('decodes named and numeric entities', ({ expect }) => {
    const text = extractReadableText('<p>Fish &amp; chips &lt;tasty&gt; &quot;yum&quot; &#65;&#x42;</p>');
    expect(text).toBe('Fish & chips <tasty> "yum" AB');
  });

  test('leaves unknown and invalid entities intact', ({ expect }) => {
    const text = extractReadableText('<p>&bogus; &#xD800;</p>');
    expect(text).toBe('&bogus; &#xD800;');
  });

  test('collapses whitespace', ({ expect }) => {
    const text = extractReadableText('<div>one\n\n  two\t three</div>');
    expect(text).toBe('one two three');
  });

  test('caps the output length', ({ expect }) => {
    const text = extractReadableText(`<p>${'a'.repeat(50_000)}</p>`);
    expect(text.length).toBe(40_000);
  });
});
