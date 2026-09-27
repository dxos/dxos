//
// Copyright 2026 DXOS.org
//

import { type ExpectStatic, describe, test } from 'vitest';

import { type Bounds, type Camera, type PortalNode, type Scene } from '../model/types.ts';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  coverage,
  enterPortal,
  exitPortal,
  fitBounds,
  portalFrame,
  portalScale,
  sceneToScreen,
  screenToScene,
  zoomAt,
} from './camera.ts';
import { contentBounds, sceneBounds } from './hit.ts';

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

  test('fitBounds stops at maxZoom and still centres the bounds', ({ expect }) => {
    const bounds = { x: 100, y: 100, width: 400, height: 100 };
    const camera = fitBounds(bounds, viewport, 0, 1);
    expect(camera.zoom).toBe(1);
    const centre = sceneToScreen(camera, { x: 300, y: 150 });
    expect(centre.x).toBeCloseTo(400);
    expect(centre.y).toBeCloseTo(300);
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

  test('portalFrame is a power-of-four multiple of the portal on the grid, containing the child bounds', ({
    expect,
  }) => {
    const frame = portalFrame(portal, child);
    // 1600 × 1000 needs four 480 × 300 portals across; the frame is 1920 × 1200.
    expect([frame.width, frame.height]).toEqual([1920, 1200]);
    // On the major grid scaled by the factor, so the child's major lines land on the parent's major lines
    // (a frame on the plain major grid only matches their spacing, up to three minor cells out of phase).
    expect(Math.abs(frame.x % 256)).toBe(0);
    expect(Math.abs(frame.y % 256)).toBe(0);
    expect(frame.x).toBeLessThanOrEqual(child.x);
    expect(frame.y).toBeLessThanOrEqual(child.y);
    expect(frame.x + frame.width).toBeGreaterThanOrEqual(child.x + child.width);
    expect(frame.y + frame.height).toBeGreaterThanOrEqual(child.y + child.height);
    // As near the child's centre as containing it allows.
    expect(Math.abs(frame.x + frame.width / 2 - (child.x + child.width / 2))).toBeLessThanOrEqual(256);
    expect(Math.abs(frame.y + frame.height / 2 - (child.y + child.height / 2))).toBeLessThanOrEqual(256);
    // A frame is its own frame, so drilling in and out is stable.
    expect(portalFrame(portal, frame)).toEqual(frame);
    // A child smaller than the portal still gets four portals across: the parent's minor grid is the
    // child's major one, never the same level.
    const small = portalFrame(portal, { x: 64, y: 64, width: 128, height: 128 });
    expect([small.width, small.height]).toEqual([1920, 1200]);
    expect(small.x).toBeLessThanOrEqual(64);
    expect(small.x + small.width).toBeGreaterThanOrEqual(192);
    // A child past four portals across jumps to sixteen, never to an in-between factor whose grid
    // would miss the parent's lines.
    const large = portalFrame(portal, { x: 0, y: 0, width: 2400, height: 600 });
    expect([large.width, large.height]).toEqual([7680, 4800]);
  });

  test('a small child in a small portal is framed by its content, not by the editing floor', ({ expect }) => {
    // A portal small enough that the default extent does not fit four of it across: framed by the floor
    // the child would need sixteen and so draw a quarter of the size, for content it does not have.
    const tile: PortalNode = {
      type: 'scene',
      id: 'p',
      z: 'A',
      center: { x: 0, y: 0 },
      size: { width: 256, height: 160 },
      scene: 'c',
    };
    const scene: Scene = {
      id: 'c',
      nodes: { a: { type: 'rect', id: 'a', z: 'A', center: { x: 0, y: 0 }, size: { width: 128, height: 128 } } },
      links: {},
    };
    const framed = portalFrame(tile, contentBounds(scene));
    const floored = portalFrame(tile, sceneBounds(scene));
    expect([framed.width, framed.height]).toEqual([1024, 640]);
    expect([floored.width, floored.height]).toEqual([4096, 2560]);
    // The child therefore draws four times the size in the same tile.
    expect(portalScale(tile, framed) / portalScale(tile, floored)).toBe(4);
  });
});
