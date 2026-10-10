//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { measure } from './ScrollAreaThumbs.tsx';

describe('measure', () => {
  test('the thumb is the share of the content in view', ({ expect }) => {
    const thumb = measure(0, 1_000, 400, 0);
    expect(thumb).toEqual({ visible: true, offset: 0, length: 160 });
  });

  test('a sticky start column shortens the track and leaves the share of the scrolling region', ({ expect }) => {
    // 200px of 800px scrolling content is in view: a quarter of the 200px track.
    const thumb = measure(0, 1_000, 400, 0, 200);
    expect(thumb).toEqual({ visible: true, offset: 200, length: 50 });
  });

  test('scrolled to the end, the thumb ends at the end of the track', ({ expect }) => {
    const thumb = measure(600, 1_000, 400, 0, 200);
    expect(thumb.offset + thumb.length).toBe(400);
  });

  test('content that fits shows no thumb', ({ expect }) => {
    expect(measure(0, 400, 400, 0, 200).visible).toBe(false);
  });
});
