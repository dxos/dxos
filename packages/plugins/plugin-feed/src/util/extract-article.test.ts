//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { extractArticle } from './extract-article';

describe('extractArticle', () => {
  test('returns empty result for empty input', async () => {
    const result = await extractArticle('');
    expect(result.markdown).toBe('');
    expect(result.imageUrls).toEqual([]);
  });

  test('strips trailing "Narrower topics" / "Broader topics" boilerplate', async () => {
    // Minimal HTML mirroring theregister.com's article + tag-cloud structure:
    // a body with the article content followed by trailing tag-list headings
    // that defuddle's content-pattern removal misses.
    const html = `
      <html><head><title>Test article</title></head>
      <body>
        <main>
          <h1>The article</h1>
          <p>Body paragraph one with some real content to keep the word count up so defuddle treats this as an article.</p>
          <p>Body paragraph two has more substantive text to ensure the heuristic doesn't discard the body. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p>Closing line. ®</p>
          <h3>Narrower topics</h3>
          <ul>
            <li><a href="/Tag/AIOps/">AIOps</a></li>
            <li><a href="/Tag/Anthropic/">Anthropic</a></li>
          </ul>
          <h3>Broader topics</h3>
          <ul>
            <li><a href="/Tag/Self-driving/">Self-driving</a></li>
          </ul>
        </main>
      </body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/test');
    expect(result.markdown).not.toMatch(/Narrower topics/i);
    expect(result.markdown).not.toMatch(/Broader topics/i);
    expect(result.markdown).not.toMatch(/AIOps/);
    expect(result.markdown).not.toMatch(/Self-driving/);
    // The article body should still be present.
    expect(result.markdown).toMatch(/Body paragraph one/);
    expect(result.markdown).toMatch(/Closing line/);
  });

  test('does not strip boilerplate-shaped headings inside the body', async () => {
    // A heading named "Topics" appears mid-article followed by more content;
    // it should NOT be treated as trailing boilerplate.
    const html = `
      <html><body><main>
        <h1>An essay</h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <h2>Topics</h2>
        <p>Here are the topics this essay covers. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.</p>
        <h2>Conclusion</h2>
        <p>That wraps it up. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      </main></body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/essay');
    // "Topics" mid-body is preserved because a non-boilerplate heading
    // ("Conclusion") follows it.
    expect(result.markdown).toMatch(/Topics/);
    expect(result.markdown).toMatch(/Conclusion/);
    expect(result.markdown).toMatch(/That wraps it up/);
  });
});
