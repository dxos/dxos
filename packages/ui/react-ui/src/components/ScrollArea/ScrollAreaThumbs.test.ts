//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { measure } from './ScrollAreaThumbs.tsx';

// Viewport of 200 over content of 800, inset 10 at both ends: track 180, thumb 45, travel 135.
// Sized so the proportional length clears MIN_THUMB, which the clamping case covers separately.
const VIEWPORT = 200;
const CONTENT = 800;
const PADDING = 10;

describe('ScrollArea thumb geometry', () => {
  test('hides the thumb when the content fits', ({ expect }) => {
    expect(measure(0, VIEWPORT, VIEWPORT, PADDING).visible).toBe(false);
    // Sub-pixel overflow is not worth a scrollbar.
    expect(measure(0, VIEWPORT + 1, VIEWPORT, PADDING).visible).toBe(false);
  });

  test('scales the thumb to the visible fraction of the content', ({ expect }) => {
    expect(measure(0, CONTENT, VIEWPORT, PADDING)).toEqual({ visible: true, offset: PADDING, length: 45 });
  });

  test('maps scroll offset onto the track, inset at both ends', ({ expect }) => {
    // Fully scrolled: the thumb ends flush with the far inset rather than the viewport edge.
    const end = measure(CONTENT - VIEWPORT, CONTENT, VIEWPORT, PADDING);
    expect(end.offset + end.length).toBe(VIEWPORT - PADDING);
    expect(measure((CONTENT - VIEWPORT) / 2, CONTENT, VIEWPORT, PADDING).offset).toBe(PADDING + 67.5);
  });

  test('hides the thumb when the track cannot seat the minimum length', ({ expect }) => {
    // Track of 10 (30 - 2 x 10) is shorter than MIN_THUMB, which would overhang the far edge.
    expect(measure(0, CONTENT, 30, PADDING).visible).toBe(false);
  });

  test('never shrinks below the minimum grabbable length', ({ expect }) => {
    const { length } = measure(0, 100_000, VIEWPORT, PADDING);
    expect(length).toBe(24);
  });
});
