//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SCREEN_FADE, screenAt, screenSpans } from './screen.ts';

describe('screen text', () => {
  test('a caption beat holds until the next caption beat; its lines fade in after the headline', ({ expect }) => {
    const spans = screenSpans({
      duration: 10,
      script: [{ duration: 2, caption: 'Title\nOne\nTwo' }, { duration: 4 }, { duration: 1, caption: '' }],
    });
    expect(spans).toMatchObject([{ kind: 'caption', start: 0, end: 6, lines: ['Title', 'One', 'Two'] }]);
    expect(screenAt(spans, 0).caption?.opacity).toBe(0);
    const early = screenAt(spans, SCREEN_FADE);
    expect(early.caption?.lines.map((line) => line.opacity)).toEqual([1, 0, 0]);
    // The first line under the headline starts once the headline is up; the next one `stagger` later.
    const later = screenAt(spans, SCREEN_FADE * 1.5);
    expect(later.caption?.lines[1].opacity).toBeCloseTo(0.5);
    expect(later.caption?.lines[2].opacity).toBe(0);
    expect(screenAt(spans, 6 - SCREEN_FADE / 2).caption?.opacity).toBeCloseTo(0.5);
    expect(screenAt(spans, 7).caption).toBeUndefined();
  });

  test('an image caption puts every text line under the image; a side title shows all its lines', ({ expect }) => {
    const spans = screenSpans({
      duration: 4,
      script: [
        { duration: 1, caption: 'Your team\nYour data', captionImage: 'logo.svg', sideTitle: 'ECHO\nHypergraph' },
      ],
    });
    const frame = screenAt(spans, SCREEN_FADE);
    expect(frame.caption?.image).toEqual({ src: 'logo.svg', opacity: 1 });
    expect(frame.caption?.lines[0].opacity).toBe(0);
    expect(frame.sideTitle).toEqual({ lines: ['ECHO', 'Hypergraph'], opacity: 1 });
  });

  test('a curtain fades to its colour, holds, and fades back', ({ expect }) => {
    const spans = screenSpans({
      duration: 6,
      script: [{ duration: 1 }, { duration: 1, curtain: { color: '#101010', fade: 1, hold: 0.5 } }],
    });
    expect(spans).toMatchObject([{ kind: 'curtain', start: 1, end: 3.5 }]);
    expect(screenAt(spans, 1.5).curtain).toEqual({ color: '#101010', opacity: 0.5 });
    expect(screenAt(spans, 2.25).curtain?.opacity).toBe(1);
    expect(screenAt(spans, 3).curtain?.opacity).toBeCloseTo(0.5);
    expect(screenAt(spans, 3.5).curtain).toBeUndefined();
  });

  test('screen text placed by hand shows from its time', ({ expect }) => {
    const spans = screenSpans({
      duration: 6,
      screen: [{ kind: 'side-title', at: 2, duration: 2, text: 'Side', fade: 0 }],
    });
    expect(screenAt(spans, 1.9).sideTitle).toBeUndefined();
    expect(screenAt(spans, 2).sideTitle).toEqual({ lines: ['Side'], opacity: 1 });
  });
});
