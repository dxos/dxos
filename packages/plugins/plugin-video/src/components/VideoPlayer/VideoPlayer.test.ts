//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toEmbedUrl } from './embed-url-parsers';

describe('toEmbedUrl', () => {
  test('maps a YouTube watch URL to an embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('maps a youtu.be short URL to an embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('passes through an existing YouTube embed URL', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  test('adds start + autoplay params for YouTube watch URL', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 12)).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=12&autoplay=1',
    );
  });

  test('adds start + autoplay params for youtu.be short URL', ({ expect }) => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ', 30)).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&autoplay=1',
    );
  });

  test('clamps negative startTime to 0 for YouTube', ({ expect }) => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', -3.7)).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=0&autoplay=1',
    );
  });

  test('maps a Vimeo URL to a player URL', ({ expect }) => {
    expect(toEmbedUrl('https://vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871');
  });

  test('adds start hash + autoplay for Vimeo URL', ({ expect }) => {
    expect(toEmbedUrl('https://vimeo.com/76979871', 45)).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1#t=45s',
    );
  });

  test('falls back to the raw URL for direct media files', ({ expect }) => {
    expect(toEmbedUrl('https://example.com/clip.mp4')).toBe('https://example.com/clip.mp4');
  });

  test('appends hash fragment startTime for fallback media URLs', ({ expect }) => {
    expect(toEmbedUrl('https://example.com/clip.mp4', 20)).toBe('https://example.com/clip.mp4#t=20');
  });

  test('returns undefined for non-http(s) URLs', ({ expect }) => {
    expect(toEmbedUrl('javascript:alert(1)')).toBeUndefined();
  });

  test('returns undefined for a non-URL string', ({ expect }) => {
    expect(toEmbedUrl('not a url')).toBeUndefined();
  });
});
