//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { createConfig2D } from './config2d.tsx';

const document: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', center: { x: 100, y: 0 }, size: { width: 100, height: 100 } },
        b: { id: 'b', type: 'rect', center: { x: 500, y: 200 }, size: { width: 100, height: 100 } },
      },
    },
  ],
  models: [],
};

describe('config2d', () => {
  test('reset is actual size with the content centred in the view, not the origin', () => {
    const config = createConfig2D();
    const size = { width: 800, height: 600 };
    const camera = config.camera.reset({ x: 0, y: 0, zoom: 1 }, document, 'root', size);
    expect(camera.zoom).toBe(1);
    // The content's centre (300, 100) lands on the view's centre (400, 300).
    expect((300 + camera.x) * camera.zoom).toBe(400);
    expect((100 + camera.y) * camera.zoom).toBe(300);
  });
});
