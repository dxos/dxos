//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { fetchStandardSite, parseStandardSiteActor } from './standard-site';

// RSS/Atom coverage lives in rss.test.ts.

// Sample Standard.site read chain: resolveHandle → plc.directory (DID doc) → listRecords → getProfile →
// getRecord (publication). One document references its publication by `at://` URI, the other by a bare
// `https://` URL (resolved directly, no getRecord needed).
const DID = 'did:plc:abc123';
const PDS = 'https://pds.example.com';
const PUBLICATION_URI = `at://${DID}/site.standard.publication/self`;

const DID_DOCUMENT = {
  service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }],
};

const PROFILE = {
  did: DID,
  handle: 'alice.example.com',
  displayName: 'Alice',
  avatar: 'https://example.com/avatar.jpg',
  description: 'Long-form writing.',
};

const PUBLICATION = {
  uri: PUBLICATION_URI,
  value: { url: 'https://alice.example.com/', name: 'Alice Blog' },
};

const LIST_RECORDS = {
  records: [
    {
      uri: `at://${DID}/site.standard.document/doc1`,
      value: {
        site: PUBLICATION_URI,
        title: 'First Article',
        path: '/blog/first',
        description: 'A first long-form post.',
        content: { $type: 'site.standard.content.markdown', text: '# First\n\nBody text.', version: '1.0' },
        textContent: 'First Body text.',
        publishedAt: '2026-01-02T00:00:00Z',
        tags: ['echo'],
      },
    },
    {
      uri: `at://${DID}/site.standard.document/doc2`,
      value: {
        site: 'https://alice.example.com',
        title: 'Older Article',
        path: '/blog/older',
        content: { $type: 'site.standard.content.markdown', text: '# Older' },
        publishedAt: '2026-01-01T00:00:00Z',
      },
    },
  ],
  cursor: 'cursor-1',
};

const okJson = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) });

/** Routes a mocked `fetch` by endpoint so the resolution chain is order-independent. */
const routedFetch = () =>
  vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('resolveHandle')) {
      return okJson({ did: DID });
    }
    if (url.includes('plc.directory')) {
      return okJson(DID_DOCUMENT);
    }
    if (url.includes('listRecords')) {
      return okJson(LIST_RECORDS);
    }
    if (url.includes('getProfile')) {
      return okJson(PROFILE);
    }
    if (url.includes('getRecord')) {
      return okJson(PUBLICATION);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  });

describe('FeedFetcher', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchStandardSite', () => {
    test('resolves a handle and maps Standard.site documents', async ({ expect }) => {
      globalThis.fetch = routedFetch();

      const result = await fetchStandardSite('alice.example.com');

      expect(result.feed.type).toBe('standard-site');
      // Feed name comes from the publication; icon/description from the author profile.
      expect(result.feed.name).toBe('Alice Blog');
      expect(result.feed.iconUrl).toBe('https://example.com/avatar.jpg');
      expect(result.feed.description).toBe('Long-form writing.');

      // Newest first.
      expect(result.posts).toHaveLength(2);
      const [first, second] = result.posts;

      expect(first.title).toBe('First Article');
      // Canonical link = publication url + document path (publication trailing slash stripped).
      expect(first.link).toBe('https://alice.example.com/blog/first');
      expect(first.content).toBe('# First\n\nBody text.');
      expect(first.description).toBe('A first long-form post.');
      expect(first.author).toBe('Alice');
      expect(first.published).toBe('2026-01-02T00:00:00Z');
      // The record AT-URI is the dedup guid.
      expect(first.guid).toBe(`at://${DID}/site.standard.document/doc1`);

      // `site` given as a bare https URL is used directly (no publication name → falls back is unused here).
      expect(second.title).toBe('Older Article');
      expect(second.link).toBe('https://alice.example.com/blog/older');
      expect(second.content).toBe('# Older');
    });

    test('passes a DID straight through to listRecords (no handle resolution)', async ({ expect }) => {
      const mockFetch = routedFetch();
      globalThis.fetch = mockFetch;

      await fetchStandardSite('did:plc:abc123');

      const calls = mockFetch.mock.calls.map((call) => String(call[0]));
      expect(calls.some((url) => url.includes('resolveHandle'))).toBe(false);
      expect(calls.some((url) => url.includes('listRecords') && url.includes('repo=did%3Aplc%3Aabc123'))).toBe(true);
    });

    test('throws on a non-ok response', async ({ expect }) => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchStandardSite('nonexistent.example.com')).rejects.toThrow('Standard.site fetch failed: 404');
    });
  });

  describe('parseStandardSiteActor', () => {
    test('extracts handle from bsky.app URL', ({ expect }) => {
      expect(parseStandardSiteActor('https://bsky.app/profile/alice.bsky.social')).toBe('alice.bsky.social');
    });

    test('extracts handle from bsky.app URL with trailing path', ({ expect }) => {
      expect(parseStandardSiteActor('https://bsky.app/profile/alice.bsky.social/post/abc')).toBe('alice.bsky.social');
    });

    test('passes through bare handle', ({ expect }) => {
      expect(parseStandardSiteActor('dxos.org')).toBe('dxos.org');
    });

    test('strips leading @ from handle', ({ expect }) => {
      expect(parseStandardSiteActor('@alice.bsky.social')).toBe('alice.bsky.social');
    });

    test('passes through DID', ({ expect }) => {
      expect(parseStandardSiteActor('did:plc:abc123')).toBe('did:plc:abc123');
    });
  });
});
