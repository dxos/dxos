//
// Copyright 2026 DXOS.org
//

/**
 * @vitest-environment jsdom
 */

import { describe, test } from 'vitest';

import { runExtractor } from './index';
import { MAX_HTML_LENGTH, snapshotExtractor } from './snapshot';

describe('snapshot extractor', () => {
  test('captures source, hints, and html', async ({ expect }) => {
    document.head.innerHTML = '<title>Test Page</title><meta property="og:title" content="OG Title" />';
    document.body.innerHTML = '<h1>Heading</h1><p>Content</p>';

    const snapshot = await snapshotExtractor.run({ document });
    expect(snapshot.source.title).toBe('Test Page');
    expect(snapshot.source.url).toContain('://');
    expect(snapshot.source.clippedAt).toMatch(/^\d{4}-/);
    expect(snapshot.hints?.ogTitle).toBe('OG Title');
    expect(snapshot.hints?.h1).toBe('Heading');
    expect(snapshot.html).toContain('<p>Content</p>');
    expect(snapshot.htmlTruncated).toBeUndefined();
  });

  test('truncates html over MAX_HTML_LENGTH', async ({ expect }) => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    // Build a string longer than the truncation limit.
    const longText = 'a'.repeat(MAX_HTML_LENGTH + 1);
    // Set via a text node to avoid innerHTML parsing overhead.
    document.body.textContent = longText;

    const snapshot = await snapshotExtractor.run({ document });
    expect(snapshot.htmlTruncated).toBe(true);
    expect(snapshot.html!.length).toBe(MAX_HTML_LENGTH);
  });
});

describe('extractor registry', () => {
  test('runExtractor resolves with a snapshot for "snapshot"', async ({ expect }) => {
    document.head.innerHTML = '<title>Registry Test</title>';
    document.body.innerHTML = '<p>Hello</p>';

    const result = await runExtractor('snapshot', { document });
    expect(result).toMatchObject({ source: { title: 'Registry Test' } });
  });

  test('runExtractor rejects with an error mentioning the name for unknown extractors', async ({ expect }) => {
    await expect(runExtractor('nope', { document })).rejects.toThrow('nope');
  });
});
