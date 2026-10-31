//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compositeBounds } from '@dxos/react-ui-canvas';
import { sampleDocument, toRenderLists2D } from '@dxos/react-ui-canvas/headless';

import {
  DURATION,
  LAYOUT,
  LOGO,
  ROOT,
  SCALE_ORIGIN,
  endCardDocument,
  endCardShot,
  logoComposite,
  rootScene,
} from './spec.ts';

/** The end card's root render list at `t`, as the film draws it. */
const drawnAt = (t: number) => {
  const { lists } = toRenderLists2D(sampleDocument(endCardDocument(), ROOT, endCardShot(), t));
  const root = lists.find((list) => list.id === ROOT);
  if (!root) {
    throw new Error('The end card has no root scene.');
  }
  return root;
};

describe('end card shot', () => {
  test('at rest the shot draws the scene as it was drawn', ({ expect }) => {
    const rest = rootScene();
    const drawn = drawnAt(DURATION);
    expect(drawn.nodes.tagline.center).toEqual(LAYOUT.tagline);
    expect(drawn.nodes.cta.style?.opacity).toBe(0.72);
    expect(drawn.nodes.rule.size).toEqual(rest.nodes.rule.size);
  });

  test('the logo scales about its scale origin, its box drawn at the keyed scale', ({ expect }) => {
    const content = compositeBounds(logoComposite());
    if (!content) {
      throw new Error('The logo has no parts.');
    }
    const atStart = drawnAt(0).nodes[LOGO];
    const atEnd = drawnAt(DURATION).nodes[LOGO];
    expect(atStart.style?.opacity).toBe(0);
    expect(atStart.size.width).toBeCloseTo(content.width * 0.9);
    expect(atEnd.size.height).toBeCloseTo(content.height * 1.012);
    // The box's centre scales about the scale origin with its size.
    const rest = rootScene().nodes[LOGO].center;
    expect(atEnd.center.x).toBeCloseTo(SCALE_ORIGIN.x + (rest.x - SCALE_ORIGIN.x) * 1.012);
    expect(atEnd.center.y).toBeCloseTo(SCALE_ORIGIN.y + (rest.y - SCALE_ORIGIN.y) * 1.012);
  });

  test('a line rises into place as it fades in', ({ expect }) => {
    expect(drawnAt(0.55).nodes.tagline.center).toEqual({ x: LAYOUT.tagline.x, y: LAYOUT.tagline.y + 24 });
    expect(drawnAt(0.55).nodes.tagline.style?.opacity).toBe(0);
  });
});
