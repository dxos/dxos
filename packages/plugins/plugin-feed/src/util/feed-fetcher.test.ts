//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { fetchAtproto, parseAtprotoActor } from './fetch-atproto';
import { fetchRss } from './fetch-rss';

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

// Sample Bluesky XRPC response fixture.
const BSKY_RESPONSE = {
  feed: [
    {
      post: {
        uri: 'at://did:plc:abc123/app.bsky.feed.post/rec1',
        cid: 'bafyabc1',
        author: {
          did: 'did:plc:abc123',
          handle: 'alice.bsky.social',
          displayName: 'Alice',
          avatar: 'https://example.com/avatar.jpg',
        },
        record: {
          text: 'Hello from Bluesky!',
          createdAt: '2025-03-01T08:00:00Z',
        },
        likeCount: 5,
        repostCount: 2,
        replyCount: 1,
        indexedAt: '2025-03-01T08:00:01Z',
      },
    },
    {
      post: {
        uri: 'at://did:plc:abc123/app.bsky.feed.post/rec2',
        cid: 'bafyabc2',
        author: {
          did: 'did:plc:abc123',
          handle: 'alice.bsky.social',
          displayName: 'Alice',
        },
        record: {
          text: 'Second Bluesky post with more text content here.',
          createdAt: '2025-02-28T18:00:00Z',
        },
        indexedAt: '2025-02-28T18:00:01Z',
      },
    },
  ],
  cursor: 'cursor-abc',
};

describe('FeedFetcher', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchRss', () => {
    test('parses RSS feed into Subscription objects', async ({ expect }) => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(RSS_XML),
      });

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
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(ATOM_XML),
      });

      const result = await fetchRss('https://example.com/atom');

      expect(result.feed.name).toBe('Test Atom Feed');
      expect(result.feed.description).toBe('An Atom test feed.');
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('Atom Entry One');
      expect(result.posts[0].author).toBe('Charlie');
      expect(result.posts[0].guid).toBe('atom-entry-1');
      expect(result.posts[0].link).toBe('https://example.com/atom-1');
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
  });

  describe('fetchAtproto', () => {
    test('fetches and parses Bluesky author feed', async ({ expect }) => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(BSKY_RESPONSE),
      });

      const result = await fetchAtproto('alice.bsky.social');

      expect(result.feed.name).toBe('Alice');
      expect(result.feed.type).toBe('atproto');
      expect(result.feed.description).toBe('Bluesky posts from @alice.bsky.social');
      expect(result.posts).toHaveLength(2);

      expect(result.posts[0].description).toBe('Hello from Bluesky!');
      expect(result.posts[0].author).toBe('Alice');
      expect(result.posts[0].guid).toBe('at://did:plc:abc123/app.bsky.feed.post/rec1');
      expect(result.posts[0].link).toContain('bsky.app/profile/alice.bsky.social/post/rec1');
      expect(result.posts[0].published).toBe('2025-03-01T08:00:00Z');

      expect(result.posts[1].description).toBe('Second Bluesky post with more text content here.');
    });

    test('handles bsky.app profile URL', async ({ expect }) => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(BSKY_RESPONSE),
      });
      globalThis.fetch = mockFetch;

      await fetchAtproto('https://bsky.app/profile/alice.bsky.social');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('actor=alice.bsky.social');
    });

    test('throws on non-ok response', async ({ expect }) => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchAtproto('nonexistent.bsky.social')).rejects.toThrow('AT Protocol fetch failed: 404 Not Found');
    });
  });

  describe('parseAtprotoActor', () => {
    test('extracts handle from bsky.app URL', ({ expect }) => {
      expect(parseAtprotoActor('https://bsky.app/profile/alice.bsky.social')).toBe('alice.bsky.social');
    });

    test('extracts handle from bsky.app URL with trailing path', ({ expect }) => {
      expect(parseAtprotoActor('https://bsky.app/profile/alice.bsky.social/post/abc')).toBe('alice.bsky.social');
    });

    test('passes through bare handle', ({ expect }) => {
      expect(parseAtprotoActor('alice.bsky.social')).toBe('alice.bsky.social');
    });

    test('strips leading @ from handle', ({ expect }) => {
      expect(parseAtprotoActor('@alice.bsky.social')).toBe('alice.bsky.social');
    });

    test('passes through DID', ({ expect }) => {
      expect(parseAtprotoActor('did:plc:abc123')).toBe('did:plc:abc123');
    });
  });
});
