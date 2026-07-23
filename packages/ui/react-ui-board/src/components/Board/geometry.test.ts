//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Point, type Scroll, anchoredScroll, boardPad, viewportCenterAnchor } from './geometry';

const viewport = { width: 1000, height: 800 };
const board = { width: 3000, height: 2400 };

describe('boardPad', () => {
  test('overscroll pads by half the viewport', ({ expect }) => {
    expect(boardPad({ viewport, board, zoom: 1, overscroll: true })).toEqual({ x: 500, y: 400 });
  });

  test('overflowing board gets no pad', ({ expect }) => {
    // At zoom 1 the 3000px board overflows the 1000px viewport.
    expect(boardPad({ viewport, board, zoom: 1, overscroll: false })).toEqual({ x: 0, y: 0 });
  });

  test('a board smaller than the viewport is centred by the pad', ({ expect }) => {
    // At zoom 0.25 the board is 750×600, smaller than 1000×800.
    expect(boardPad({ viewport, board, zoom: 0.25, overscroll: false })).toEqual({ x: 125, y: 100 });
  });
});

describe('anchor round-trip', () => {
  test('anchoredScroll and viewportCenterAnchor are inverses', ({ expect }) => {
    const zoom = 0.5;
    const pad = boardPad({ viewport, board, zoom, overscroll: false });
    const anchor = { x: 1234, y: 567 };
    const scroll = anchoredScroll({ anchor, viewport, pad, zoom });
    expect(viewportCenterAnchor({ scroll, viewport, pad, zoom })).toEqual(anchor);
  });
});

describe('zoom keeps the anchor centred', () => {
  test('zooming out holds the board centre', ({ expect }) => {
    // Centred on the board centre (1500, 1200) at zoom 1 (overflowing, pad 0).
    const scroll = { left: 1500 - viewport.width / 2, top: 1200 - viewport.height / 2 };
    const { anchor, centredAfter } = zoomAnchor(1, 0.5, scroll);
    expect(anchor).toEqual({ x: 1500, y: 1200 });
    expect(centredAfter).toEqual(anchor);
  });

  test('zooming out holds an off-centre point', ({ expect }) => {
    const { anchor, centredAfter } = zoomAnchor(1, 0.5, { left: 400, top: 300 });
    expect(centredAfter).toEqual(anchor);
  });

  test('zooming across the overflow→fit boundary holds the anchor', ({ expect }) => {
    // 0.5 overflows (1500>1000), 0.25 fits (750<1000) — the pad changes from 0 to 125.
    const { anchor, centredAfter } = zoomAnchor(0.5, 0.25, { left: 700, top: 500 });
    expect(centredAfter).toEqual(anchor);
  });

  test('a fitting board centres — the ideal offset goes negative and the pad recentres', ({ expect }) => {
    // The point held at 0.5 (content 1000) can't be centred once the 0.25 board (750px) fits the 1000px
    // viewport: anchoredScroll returns a negative offset (below), which the browser clamps to 0, and the
    // pad margin then centres the board. This is the intended clamped fallback.
    const { next } = zoomAnchor(0.5, 0.25, { left: 0, top: 0 });
    expect(next.left).toBeLessThan(0);
    expect(boardPad({ viewport, board, zoom: 0.25, overscroll: false })).toEqual({ x: 125, y: 100 });
  });
});

// Recover the anchor from the pre-zoom scroll, then compute the post-zoom scroll and the point it
// re-centres (helpers live below the suites so tests read top-down).
const zoomAnchor = (from: number, to: number, scroll: Scroll): { anchor: Point; next: Scroll; centredAfter: Point } => {
  const padFrom = boardPad({ viewport, board, zoom: from, overscroll: false });
  const anchor = viewportCenterAnchor({ scroll, viewport, pad: padFrom, zoom: from });
  const padTo = boardPad({ viewport, board, zoom: to, overscroll: false });
  const next = anchoredScroll({ anchor, viewport, pad: padTo, zoom: to });
  const centredAfter = viewportCenterAnchor({ scroll: next, viewport, pad: padTo, zoom: to });
  return { anchor, next, centredAfter };
};
