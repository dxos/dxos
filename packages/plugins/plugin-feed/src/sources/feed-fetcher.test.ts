//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { fetchAtproto, parseAtprotoActor } from './atproto';

// RSS/Atom coverage lives in rss.test.ts.

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
