//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { fetchStandardSite, listStandardSitePublications, parseStandardSiteActor } from './standard-site';

// The Standard.site fetchers are Effects (they provide their own HTTP layer); run them for assertions.
// `fetchStandardSite` now takes the publication site reference (`at://` or `https://`) as `url`.
const runFetchStandardSite = (url: string) => EffectEx.runPromise(fetchStandardSite(url));

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

  describe('fetchStandardSite', () => {
    test('takes an at:// publication reference, fetches only matching documents', async ({ expect }) => {
      globalThis.fetch = routedFetch();

      // `url` is the publication site reference; DID is extracted directly from the at:// URI.
      const result = await runFetchStandardSite(PUBLICATION_URI);

      expect(result.feed.type).toBe('standard-site');
      // Feed name and url come from the publication record; icon/description from the author profile.
      expect(result.feed.name).toBe('Alice Blog');
      expect(result.feed.url).toBe(PUBLICATION_URI);
      expect(result.feed.iconUrl).toBe('https://example.com/avatar.jpg');
      expect(result.feed.description).toBe('Long-form writing.');

      // Only the document whose `site` matches PUBLICATION_URI is included.
      expect(result.posts).toHaveLength(1);
      const [first] = result.posts;
      expect(first.title).toBe('First Article');
      expect(first.link).toBe('https://alice.example.com/blog/first');
      expect(first.content).toBe('# First\n\nBody text.');
      expect(first.description).toBe('A first long-form post.');
      expect(first.author).toBe('Alice');
      expect(first.published).toBe('2026-01-02T00:00:00Z');
      expect(first.guid).toBe(`at://${DID}/site.standard.document/doc1`);
    });

    test('takes an https:// publication reference, resolves DID via /.well-known/atproto-did', async ({ expect }) => {
      const mockFetch = routedFetch();
      globalThis.fetch = mockFetch;

      // The https:// site reference triggers a /.well-known/atproto-did lookup for the DID.
      const result = await runFetchStandardSite('https://alice.example.com');

      const calls = mockFetch.mock.calls.map((call) => String(call[0]));
      expect(calls.some((url) => url.includes('/.well-known/atproto-did'))).toBe(true);
      expect(calls.some((url) => url.includes('resolveHandle'))).toBe(false);

      // The document whose `site` is 'https://alice.example.com' is the only match.
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('Older Article');
    });

    test('fails on a non-ok response', async ({ expect }) => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }));

      await expect(runFetchStandardSite(PUBLICATION_URI)).rejects.toThrow(/Fetch failed/);
    });
  });

  describe('listStandardSitePublications', () => {
    test('lists the distinct publications a handle publishes under', async ({ expect }) => {
      globalThis.fetch = routedFetch();

      const publications = await EffectEx.runPromise(listStandardSitePublications('alice.example.com'));

      // One `at://` publication (resolved via getRecord) and one bare `https://` site.
      expect(publications).toHaveLength(2);
      const bySite = new Map(publications.map((publication) => [publication.site, publication]));
      expect(bySite.get(PUBLICATION_URI)?.name).toBe('Alice Blog');
      expect(bySite.get('https://alice.example.com')?.url).toBe('https://alice.example.com');
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

// Helpers

const okJson = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });

/**
 * Routes a mocked `fetch` by endpoint so the resolution chain is order-independent.
 * `fetchStandardSite` takes a site reference as `url`:
 *   - `at://did:plc:abc123/…` → extract DID → plc.directory → listRecords → getProfile → getRecord
 *   - `https://alice.example.com` → /.well-known/atproto-did → plc.directory → listRecords → getProfile
 */
const routedFetch = () =>
  vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('/.well-known/atproto-did')) {
      return okJson({ did: DID });
    }
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
