//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Bookmark } from './index';

const snapshot = {
  source: {
    url: 'https://example.com/article',
    title: 'Tab Title',
    favicon: 'https://example.com/favicon.ico',
    clippedAt: '2026-06-09T12:00:00.000Z',
  },
  hints: {
    ogTitle: 'OG Title',
    ogDescription: 'A description.',
    ogImage: 'https://example.com/og.png',
  },
};

describe('Bookmark.fromSnapshot', () => {
  test('prefers og hints', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot(snapshot);
    expect(bookmark.title).toBe('OG Title');
    expect(bookmark.url).toBe('https://example.com/article');
    expect(bookmark.excerpt).toBe('A description.');
    expect(bookmark.image).toBe('https://example.com/og.png');
    expect(bookmark.favicon).toBe('https://example.com/favicon.ico');
  });

  test('prefers the captured thumbnail over the og-image URL', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({ ...snapshot, imageData: 'data:image/jpeg;base64,AAAA' });
    expect(bookmark.image).toBe('data:image/jpeg;base64,AAAA');
  });

  test('falls back to tab title and selection text', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://a.com', title: 'Tab Title', clippedAt: '2026-06-09T12:00:00.000Z' },
      selection: { text: 'x'.repeat(400) },
    });
    expect(bookmark.title).toBe('Tab Title');
    expect(bookmark.excerpt).toHaveLength(280);
    expect(bookmark.image).toBeUndefined();
  });

  test('maps snapshot with no hints and no selection', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://a.com', title: 'Tab Title', clippedAt: '2026-06-09T12:00:00.000Z' },
    });
    expect(bookmark.title).toBe('Tab Title');
    expect(bookmark.url).toBe('https://a.com');
    expect(bookmark.excerpt).toBeUndefined();
    expect(bookmark.image).toBeUndefined();
    expect(bookmark.favicon).toBeUndefined();
  });

  test('excerpt prefers the picked/selected text over og:description', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
      selection: { text: 'User-picked extract.' },
      hints: { ogDescription: 'Marketing blurb.' },
    });
    expect(bookmark.excerpt).toBe('User-picked extract.');
  });

  test('excerpt falls back to og:description without a selection', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
      hints: { ogDescription: 'Marketing blurb.' },
    });
    expect(bookmark.excerpt).toBe('Marketing blurb.');
  });

  test('excerpt truncates picked text to 280 chars', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
      selection: { text: 'x'.repeat(400) },
    });
    expect(bookmark.excerpt?.length).toBe(280);
  });
});
