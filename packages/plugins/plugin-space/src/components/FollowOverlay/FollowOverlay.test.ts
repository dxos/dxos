//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import { describe, test } from 'vitest';

import { DX_POINT_AT_ANCHOR, DX_POINTER_ANCHORS_ATTR, type PointAtAnchorDetail } from '@dxos/ui-types';

import { type ShownPointer, placePointer } from './FollowOverlay.tsx';

const BOX = { left: 100, top: 50, width: 400, height: 600, right: 500, bottom: 650, x: 100, y: 50 };

/** A plank whose content draws the anchor `pos:7` at (220, 130), as an editor would. */
const makePlank = (answers = true) => {
  const plank = document.createElement('div');
  plank.getBoundingClientRect = () => ({ ...BOX, toJSON: () => BOX });
  const content = document.createElement('div');
  content.setAttribute(DX_POINTER_ANCHORS_ATTR, '');
  content.addEventListener(DX_POINT_AT_ANCHOR, (event) => {
    if (answers && event instanceof CustomEvent) {
      const detail: PointAtAnchorDetail = event.detail;
      if (detail.anchor === 'pos:7') {
        detail.point = { x: 220 + detail.offset.x, y: 130 + detail.offset.y };
      }
    }
  });
  plank.appendChild(content);
  return plank;
};

const pointer = (anchor?: ShownPointer['anchor']): ShownPointer => ({
  key: 's1',
  name: 'Alice',
  hue: 'indigo',
  plank: 'root/s/doc',
  companion: false,
  style: 'cursor',
  x: 0.5,
  y: 0.25,
  ...(anchor && { anchor }),
});

describe('placePointer', () => {
  test('draws on the spot the content names, offset as it was sent', ({ expect }) => {
    expect(placePointer(makePlank(), pointer({ id: 'pos:7', offset: { x: 3, y: 4 } }))).toEqual({
      left: 223,
      top: 134,
    });
  });

  test('falls back to the plank fractions when no content finds the anchor', ({ expect }) => {
    expect(placePointer(makePlank(false), pointer({ id: 'pos:7', offset: { x: 3, y: 4 } }))).toEqual({
      left: 300,
      top: 200,
    });
    expect(placePointer(makePlank(), pointer({ id: 'pos:99', offset: { x: 0, y: 0 } }))).toEqual({
      left: 300,
      top: 200,
    });
  });

  test('draws nothing when the named spot is outside the plank, scrolled out of this view', ({ expect }) => {
    expect(placePointer(makePlank(), pointer({ id: 'pos:7', offset: { x: 0, y: 900 } }))).toBeUndefined();
  });

  test('uses the fractions for a pointer with no anchor', ({ expect }) => {
    expect(placePointer(makePlank(), pointer())).toEqual({ left: 300, top: 200 });
  });
});
