//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseYouTubeDescription } from './youtube';

describe('parseYouTubeDescription', () => {
  test('extracts the full shortDescription from ytInitialPlayerResponse', ({ expect }) => {
    const description = 'Line one.\nLine two with a } brace and a "quote".\nLine three.';
    const html = `<html><script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":${JSON.stringify(
      description,
    )}}};</script></html>`;
    expect(parseYouTubeDescription(html)).toBe(description);
  });

  test('falls back to the microformat description', ({ expect }) => {
    const description = 'Microformat description.';
    const html = `<script>ytInitialPlayerResponse = {"microformat":{"playerMicroformatRenderer":{"description":{"simpleText":${JSON.stringify(
      description,
    )}}}}};</script>`;
    expect(parseYouTubeDescription(html)).toBe(description);
  });

  test('falls back to the og:description meta tag', ({ expect }) => {
    const html = '<head><meta property="og:description" content="A &amp; B short description"></head>';
    expect(parseYouTubeDescription(html)).toBe('A & B short description');
  });

  test('returns undefined when no description is present', ({ expect }) => {
    expect(parseYouTubeDescription('<html><body>nothing here</body></html>')).toBeUndefined();
  });
});
