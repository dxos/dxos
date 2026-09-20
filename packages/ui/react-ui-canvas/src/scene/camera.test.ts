//
// Copyright 2026 DXOS.org
//

import { type ExpectStatic, describe, test } from 'vitest';

import {
  MAX_ZOOM,
  MIN_ZOOM,
  coverage,
  enterPortal,
  exitPortal,
  fitBounds,
  portalFrame,
  sceneToScreen,
  screenToScene,
  zoomAt,
} from './camera.ts';
import { type Bounds, type Camera, type PortalNode } from './types.ts';

const viewport = { width: 800, height: 600 };

const portal: PortalNode = {
  type: 'scene',
  id: 'p',
  z: 'V',
  center: { x: 640, y: 620 },
  size: { width: 480, height: 300 },
  scene: 'child',
};

const child: Bounds = { x: -20, y: 40, width: 1600, height: 1000 };

const expectCamera = (expect: ExpectStatic, actual: Camera, expected: Camera) => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.zoom).toBeCloseTo(expected.zoom, 6);
};

describe('camera', () => {
  test('scene ↔ screen round-trips', ({ expect }) => {
    const camera = { x: 120, y: -40, zoom: 1.75 };
    const point = { x: 333, y: -12 };
    const back = screenToScene(camera, sceneToScreen(camera, point));
    expect(back.x).toBeCloseTo(point.x);
    expect(back.y).toBeCloseTo(point.y);
  });

  test('zoomAt keeps the point under the cursor fixed and clamps', ({ expect }) => {
    const camera = { x: 10, y: 20, zoom: 1 };
    const screen = { x: 300, y: 200 };
    const anchor = screenToScene(camera, screen);
    const zoomed = zoomAt(camera, screen, 2.5);
    const after = screenToScene(zoomed, screen);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
    expect(zoomAt(camera, screen, 1000).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(camera, screen, 0).zoom).toBe(MIN_ZOOM);
  });

  test('fitBounds centres the bounds and fills the viewport', ({ expect }) => {
    const bounds = { x: 100, y: 100, width: 400, height: 100 };
    const camera = fitBounds(bounds, viewport, 0);
    expect(camera.zoom).toBeCloseTo(2);
    const centre = sceneToScreen(camera, { x: 300, y: 150 });
    expect(centre.x).toBeCloseTo(400);
    expect(centre.y).toBeCloseTo(300);
    expect(coverage(camera, bounds, viewport)).toBeCloseTo((800 * 200) / (800 * 600));
  });

  test('exitPortal ∘ enterPortal is the identity', ({ expect }) => {
    const camera = { x: -300, y: -450, zoom: 1.3 };
    expectCamera(expect, exitPortal(enterPortal(camera, portal, child), portal, child), camera);
  });

  test('enterPortal keeps a child point on the same screen pixel', ({ expect }) => {
    const camera = { x: -300, y: -450, zoom: 1.3 };
    const inner = enterPortal(camera, portal, child);
    // The child's top-left corner sits at the portal's top-left in parent space.
    const parentPoint = { x: portal.center.x - portal.size.width / 2, y: portal.center.y - portal.size.height / 2 };
    const outer = sceneToScreen(camera, parentPoint);
    const nested = sceneToScreen(inner, { x: child.x, y: child.y });
    expect(nested.x).toBeCloseTo(outer.x);
    expect(nested.y).toBeCloseTo(outer.y);
  });

  test('coverage is 0 for an empty viewport and off-screen bounds', ({ expect }) => {
    const camera = { x: 0, y: 0, zoom: 1 };
    expect(coverage(camera, { x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 0 })).toBe(0);
    expect(coverage(camera, { x: -100, y: -100, width: 10, height: 10 }, viewport)).toBe(0);
  });

  test('portalFrame has the portal aspect, contains the child bounds and shares their centre', ({ expect }) => {
    const frame = portalFrame(portal, child);
    expect(frame.width / frame.height).toBeCloseTo(portal.size.width / portal.size.height, 6);
    expect(frame.x).toBeLessThanOrEqual(child.x);
    expect(frame.y).toBeLessThanOrEqual(child.y);
    expect(frame.x + frame.width).toBeGreaterThanOrEqual(child.x + child.width);
    expect(frame.y + frame.height).toBeGreaterThanOrEqual(child.y + child.height);
    expect(frame.x + frame.width / 2).toBeCloseTo(child.x + child.width / 2, 6);
    expect(frame.y + frame.height / 2).toBeCloseTo(child.y + child.height / 2, 6);
    // The frame maps onto the portal at the same scale as the child does.
    expect(portalFrame(portal, frame)).toEqual(frame);
  });
});
