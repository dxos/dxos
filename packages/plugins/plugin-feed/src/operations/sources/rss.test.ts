//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { fetchRss } from './rss';
// Real-world RSS feed (CDATA-wrapped summary + content:encoded HTML), loaded via Vite's `?raw` suffix.
import FEED_XML from './testing/feed.xml?raw';

// Sample RSS XML fixture.
const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test RSS Feed</title>
    <description>A test feed.</description>
    <link>https://example.com</link>
    <item>
      <title>First Post</title>
      <link>https://example.com/post-1</link>
      <description>Description of first post.</description>
      <author>Alice</author>
      <pubDate>2025-01-15T12:00:00Z</pubDate>
      <guid>post-1</guid>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/post-2</link>
      <description>Description of second post.</description>
      <author>Bob</author>
      <pubDate>2025-01-14T12:00:00Z</pubDate>
      <guid>post-2</guid>
    </item>
  </channel>
</rss>`;

// Sample Atom XML fixture.
const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <subtitle>An Atom test feed.</subtitle>
  <entry>
    <title>Atom Entry One</title>
    <link rel="alternate" href="https://example.com/atom-1"/>
    <summary>Summary of atom entry one.</summary>
    <author><name>Charlie</name></author>
    <published>2025-02-01T10:00:00Z</published>
    <id>atom-entry-1</id>
  </entry>
</feed>`;

const mockFetchOnce = (body: string) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  });
};

describe('fetchRss', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('parses RSS feed into Subscription objects', async ({ expect }) => {
    mockFetchOnce(RSS_XML);

    const result = await fetchRss('https://example.com/rss');

    expect(result.feed.name).toBe('Test RSS Feed');
    expect(result.feed.description).toBe('A test feed.');
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].title).toBe('First Post');
    expect(result.posts[0].author).toBe('Alice');
    expect(result.posts[0].guid).toBe('post-1');
    expect(result.posts[1].title).toBe('Second Post');
    expect(result.posts[1].guid).toBe('post-2');
  });

  test('parses Atom feed into Subscription objects', async ({ expect }) => {
    mockFetchOnce(ATOM_XML);

    const result = await fetchRss('https://example.com/atom');

    expect(result.feed.name).toBe('Test Atom Feed');
    expect(result.feed.description).toBe('An Atom test feed.');
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe('Atom Entry One');
    expect(result.posts[0].author).toBe('Charlie');
    expect(result.posts[0].guid).toBe('atom-entry-1');
    expect(result.posts[0].link).toBe('https://example.com/atom-1');
  });

  test('extracts text from RSS elements that carry attributes', async ({ expect }) => {
    const xmlWithAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title type="text">Feed With Attrs</title>
    <description xml:lang="en">Feed description.</description>
    <item>
      <title type="html">Post With Attrs</title>
      <link>https://example.com/post-3</link>
      <description type="html">Post &amp; body.</description>
      <author>Dana</author>
      <pubDate>2025-05-10T12:00:00Z</pubDate>
      <guid isPermaLink="false">post-3</guid>
    </item>
  </channel>
</rss>`;
    mockFetchOnce(xmlWithAttrs);

    const result = await fetchRss('https://example.com/rss');

    expect(result.feed.name).toBe('Feed With Attrs');
    expect(result.feed.description).toBe('Feed description.');
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe('Post With Attrs');
    expect(result.posts[0].description).toBe('Post & body.');
    expect(result.posts[0].author).toBe('Dana');
    expect(result.posts[0].guid).toBe('post-3');
    expect(result.posts[0].link).toBe('https://example.com/post-3');
  });

  test('handles deeply nested HTML in description without exceeding parser limits', async ({ expect }) => {
    // Build nested HTML 200 levels deep — well past fast-xml-parser's default 100-tag cap.
    let nested = 'leaf';
    for (let index = 0; index < 200; index++) {
      nested = `<div>${nested}</div>`;
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Nested HTML Feed</title>
    <description>Feed.</description>
    <item>
      <title>Nested Post</title>
      <link>https://example.com/nested</link>
      <description>${nested}</description>
      <guid>nested-1</guid>
    </item>
  </channel>
</rss>`;
    mockFetchOnce(xml);

    const result = await fetchRss('https://example.com/rss');

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe('Nested Post');
    expect(result.posts[0].guid).toBe('nested-1');
  });

  test('uses CORS proxy when provided', async ({ expect }) => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(RSS_XML),
    });
    globalThis.fetch = mockFetch;

    await fetchRss('https://example.com/rss', { corsProxy: '/api/rss?url=' });

    expect(mockFetch).toHaveBeenCalledWith('/api/rss?url=' + encodeURIComponent('https://example.com/rss'));
  });

  test('parses a real-world RSS feed, unwrapping CDATA and converting content to markdown', async ({ expect }) => {
    mockFetchOnce(FEED_XML);

    const result = await fetchRss('https://www.theregister.com/headlines.atom');

    expect(result.feed.name).toBe('www.theregister.com - Articles');
    expect(result.feed.description).toBe('Articles from www.theregister.com');
    expect(result.posts).toHaveLength(25);

    const post = result.posts[0];
    expect(post.title).toBe("Trump's AI E-(I)-O could let feds pick winners and losers");
    expect(post.link).toBe(
      'https://www.theregister.com/ai-and-ml/2026/06/02/trump-ai-executive-order-sets-30-day-frontier-model-review/5250322',
    );
    expect(post.guid).toBe('https://www.theregister.com/a/5250322');

    // CDATA-wrapped <description> summary is unwrapped (and trimmed).
    expect(post.description).toBe("Government gets a say in 'trusted partner' access, and that worries policy experts");

    // <content:encoded> HTML is unwrapped from CDATA and converted to markdown — no raw block tags survive.
    expect(post.content).toBeDefined();
    expect(post.content).toContain('After postponing a planned signing');
    expect(post.content).not.toMatch(/<\/?(p|div|h[1-6]|ul|ol|li|a|span)\b/i);
  });
});
