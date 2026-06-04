//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { fetchRss } from '../util';
import registerFeedXml from './fixtures/theregister-ai.xml?raw';

const REGISTER_FEED_URL = 'https://api.theregister.com/api/v1/article?remapper=rss';

describe('theregister fixture', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(registerFeedXml, { status: 200, headers: { 'content-type': 'application/rss+xml' } }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('parses into Posts via the mock fetcher', async ({ expect }) => {
    const { feed, posts } = await fetchRss(REGISTER_FEED_URL);
    expect(feed.name).toMatch(/register/i);
    expect(posts.length).toBe(4);
    expect(posts.some((post) => /sovereign ai/i.test(post.title ?? ''))).toBe(true);
    expect(posts.every((post) => Boolean(post.description))).toBe(true);
  });
});
