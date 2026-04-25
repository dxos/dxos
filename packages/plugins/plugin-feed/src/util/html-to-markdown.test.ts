//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { htmlToMarkdown } from './html-to-markdown';

describe('htmlToMarkdown', () => {
  test('returns empty string for empty input', ({ expect }) => {
    expect(htmlToMarkdown('')).toBe('');
  });

  test('preserves paragraphs as blank-line separators', ({ expect }) => {
    const input = '<p>First paragraph.</p><p>Second paragraph.</p>';
    expect(htmlToMarkdown(input)).toBe('First paragraph.\n\nSecond paragraph.');
  });

  test('converts headings (h1-h6) with leading hashes', ({ expect }) => {
    const input = '<h1>Title</h1><p>Body.</p><h2>Sub</h2><p>More.</p><h3>Sub-sub</h3>';
    expect(htmlToMarkdown(input)).toBe('# Title\n\nBody.\n\n## Sub\n\nMore.\n\n### Sub-sub');
  });

  test('converts links to [text](href) and drops empty/hash anchors', ({ expect }) => {
    const input = '<p>Check out <a href="https://example.com">our site</a> and <a href="#top">top</a>.</p>';
    expect(htmlToMarkdown(input)).toBe('Check out [our site](https://example.com) and top.');
  });

  test('converts strong/em to bold/italic', ({ expect }) => {
    const input = '<p>This is <strong>bold</strong> and <em>italic</em>.</p>';
    expect(htmlToMarkdown(input)).toBe('This is **bold** and *italic*.');
  });

  test('converts unordered lists', ({ expect }) => {
    const input = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';
    expect(htmlToMarkdown(input)).toBe('- One\n- Two\n- Three');
  });

  test('converts ordered lists', ({ expect }) => {
    const input = '<ol><li>First</li><li>Second</li></ol>';
    expect(htmlToMarkdown(input)).toBe('1. First\n1. Second');
  });

  test('converts blockquotes', ({ expect }) => {
    const input = '<blockquote>To be or not to be.</blockquote>';
    expect(htmlToMarkdown(input)).toBe('> To be or not to be.');
  });

  test('converts pre/code blocks to fenced code', ({ expect }) => {
    const input = '<pre><code>const x = 1;\nconst y = 2;</code></pre>';
    expect(htmlToMarkdown(input)).toBe('```\nconst x = 1;\nconst y = 2;\n```');
  });

  test('converts inline code', ({ expect }) => {
    const input = '<p>Use the <code>htmlToMarkdown</code> helper.</p>';
    expect(htmlToMarkdown(input)).toBe('Use the `htmlToMarkdown` helper.');
  });

  test('converts <br> to a newline', ({ expect }) => {
    const input = '<p>Line one<br>Line two</p>';
    expect(htmlToMarkdown(input)).toBe('Line one\nLine two');
  });

  test('decodes common HTML entities', ({ expect }) => {
    const input = '<p>Tom &amp; Jerry &mdash; &quot;cat&quot; &amp; mouse.</p>';
    expect(htmlToMarkdown(input)).toBe('Tom & Jerry — "cat" & mouse.');
  });

  test('strips script and style blocks entirely', ({ expect }) => {
    const input = '<script>alert(1)</script><p>Body.</p><style>body{}</style>';
    expect(htmlToMarkdown(input)).toBe('Body.');
  });

  test('strips HTML comments', ({ expect }) => {
    const input = '<p>Before</p><!-- ad slot --><p>After</p>';
    expect(htmlToMarkdown(input)).toBe('Before\n\nAfter');
  });

  test('extracts the <article> region and discards surrounding chrome', ({ expect }) => {
    const input = `
      <header><nav><a href="/">Home</a></nav></header>
      <article>
        <h1>The Article</h1>
        <p>Important body.</p>
      </article>
      <footer>Copyright</footer>
    `;
    expect(htmlToMarkdown(input)).toBe('# The Article\n\nImportant body.');
  });

  test('extracts <main> when no <article> is present', ({ expect }) => {
    const input = `
      <header>Site Header</header>
      <main><p>The main body.</p></main>
      <aside>Sidebar with ads</aside>
    `;
    expect(htmlToMarkdown(input)).toBe('The main body.');
  });

  test('extracts [role="main"] when no <main> or <article>', ({ expect }) => {
    const input = '<div role="main"><p>The body.</p></div><nav>Skip me.</nav>';
    expect(htmlToMarkdown(input)).toBe('The body.');
  });

  test('falls back to <body> contents and strips boundary chrome', ({ expect }) => {
    const input = `
      <html>
        <body>
          <nav><a href="/x">x</a></nav>
          <p>Just text.</p>
          <aside>Ad.</aside>
        </body>
      </html>
    `;
    expect(htmlToMarkdown(input)).toBe('Just text.');
  });

  test('skips data: image URIs', ({ expect }) => {
    const input = '<p>Hi <img src="data:image/png;base64,iVBOR" alt="pixel"> there.</p>';
    expect(htmlToMarkdown(input)).toBe('Hi there.');
  });

  test('emits image markdown', ({ expect }) => {
    const input = '<article><p><img src="https://cdn/foo.png" alt="A photo"></p></article>';
    expect(htmlToMarkdown(input)).toBe('![A photo](https://cdn/foo.png)');
  });

  test('preserves paragraph + link in a realistic article snippet', ({ expect }) => {
    const input = `
      <article>
        <h1>Local-first software</h1>
        <p>By <a href="https://martin.kleppmann.com">Martin Kleppmann</a> and others.</p>
        <p>Cloud apps have made <strong>collaboration</strong> easy. But there are tradeoffs.</p>
        <ul>
          <li>You lose ownership.</li>
          <li>You lose offline access.</li>
        </ul>
      </article>
    `;
    expect(htmlToMarkdown(input)).toBe(
      [
        '# Local-first software',
        '',
        'By [Martin Kleppmann](https://martin.kleppmann.com) and others.',
        '',
        'Cloud apps have made **collaboration** easy. But there are tradeoffs.',
        '',
        '- You lose ownership.',
        '- You lose offline access.',
      ].join('\n'),
    );
  });

  test('extractMainContent: false processes the entire input', ({ expect }) => {
    const input = '<nav>Navigation</nav><p>Body.</p>';
    expect(htmlToMarkdown(input, { extractMainContent: false })).toBe('Body.');
  });
});
