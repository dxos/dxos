//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toEmbedUrl } from './VideoPlayer';

describe('toEmbedUrl', () => {
  test('maps a YouTube watch URL to an embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  test('maps a youtu.be short URL to an embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('passes through an existing YouTube embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  test('maps a Vimeo URL to a player URL', ({ expect }) => {
    expect(toEmbedUrl('https://vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871');
  });

  test('falls back to the raw URL for direct media files', ({ expect }) => {
    expect(toEmbedUrl('https://example.com/clip.mp4')).toBe('https://example.com/clip.mp4');
  });

  test('returns undefined for a non-URL string', ({ expect }) => {
    expect(toEmbedUrl('not a url')).toBeUndefined();
  });
});
