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

  test('strips trailing tag-cloud (heading + /Tag/ link list)', async () => {
    // theregister.com shape: a "Narrower topics" / "Broader topics" heading
    // followed by a `<ul>` of links to /Tag/* routes inside the article.
    const html = `
      <html><head><title>Test</title></head>
      <body>
        <article>
          <h1>The article</h1>
          <p>Body paragraph one with substantive text so defuddle treats this as an article. Lorem ipsum dolor sit amet.</p>
          <p>Body paragraph two. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
          <p>Closing line.</p>
          <h3>Narrower topics</h3>
          <ul>
            <li><a href="/Tag/AIOps/">AIOps</a></li>
            <li><a href="/Tag/Anthropic/">Anthropic</a></li>
            <li><a href="/Tag/ChatGPT/">ChatGPT</a></li>
          </ul>
          <h3>Broader topics</h3>
          <ul>
            <li><a href="/Tag/Self-driving/">Self-driving</a></li>
          </ul>
        </article>
      </body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/test');
    expect(result.markdown).not.toMatch(/Narrower topics/i);
    expect(result.markdown).not.toMatch(/Broader topics/i);
    expect(result.markdown).not.toMatch(/AIOps/);
    expect(result.markdown).not.toMatch(/Self-driving/);
    expect(result.markdown).toMatch(/Body paragraph one/);
    expect(result.markdown).toMatch(/Closing line/);
  });

  test('strips trailing block by class hint even without a giveaway heading', async () => {
    // No "Narrower topics"-style label — the trailing block is recognised
    // by its `class="related-articles"` hint alone. The text-pattern trim
    // could not catch this; the DOM rules can.
    const html = `
      <html><body>
        <article>
          <h1>Essay</h1>
          <p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
          <p>Final paragraph of the body. Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.</p>
          <div class="related-articles">
            <a href="/articles/abc">Another piece</a>
            <a href="/articles/def">Yet another</a>
            <a href="/articles/ghi">A third</a>
          </div>
        </article>
      </body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/essay');
    expect(result.markdown).not.toMatch(/Another piece/);
    expect(result.markdown).not.toMatch(/Yet another/);
    expect(result.markdown).toMatch(/Final paragraph of the body/);
  });

  test('strips trailing <aside> nested inside the article', async () => {
    const html = `
      <html><body>
        <main>
          <h1>News piece</h1>
          <p>News body. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.</p>
          <p>More body. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.</p>
          <aside class="more-from-author">
            <h3>More from this author</h3>
            <ul><li><a href="/by/jane/1">One</a></li><li><a href="/by/jane/2">Two</a></li></ul>
          </aside>
        </main>
      </body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/news');
    expect(result.markdown).not.toMatch(/More from this author/i);
    expect(result.markdown).toMatch(/News body/);
  });

  test('does not strip a "Topics" section in the middle of the article', async () => {
    // A section titled "Topics" appears mid-article followed by another body
    // section. Trailing-chrome pruning must leave it alone.
    const html = `
      <html><body>
        <article>
          <h1>An essay</h1>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <h2>Topics</h2>
          <p>Here are the topics this essay covers in prose form. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.</p>
          <h2>Conclusion</h2>
          <p>That wraps it up. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        </article>
      </body></html>
    `;
    const result = await extractArticle(html, 'https://example.com/essay');
    expect(result.markdown).toMatch(/Topics/);
    expect(result.markdown).toMatch(/Conclusion/);
    expect(result.markdown).toMatch(/That wraps it up/);
  });
});
