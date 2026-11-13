//
// Copyright 2026 DXOS.org
//
// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, test } from 'vitest';

import { type RenderList2D } from '../../model/index.ts';
import { defaultNodeRegistry } from '../SceneLayer/index.ts';
import { ControlFrame } from './ControlFrame.tsx';

const SCENE: RenderList2D = {
  id: 'board',
  nodes: { box: { id: 'box', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 192, height: 96 } } },
  links: {},
};

/** The overlay as the viewport draws it: in scene coordinates, under the camera's scale. */
const renderFrame = (zoom: number, selected: boolean) =>
  render(
    <svg>
      <ControlFrame
        scene={SCENE}
        registry={defaultNodeRegistry}
        capabilities={{ link: true, resize: true, update: true }}
        selection={new Set(selected ? ['box'] : [])}
        hover={selected ? undefined : 'box'}
        zoom={zoom}
      />
    </svg>,
  );

describe('ControlFrame', () => {
  afterEach(() => cleanup());

  test('a port is the same size on screen at any zoom', ({ expect }) => {
    for (const zoom of [0.25, 1, 4]) {
      const { container, unmount } = renderFrame(zoom, false);
      const ports = Array.from(container.querySelectorAll('circle'));
      expect(ports.length).toBeGreaterThan(0);
      // The overlay is scaled by the zoom, so a radius in scene px times the zoom is its radius on screen.
      for (const port of ports) {
        expect(Number(port.getAttribute('r')) * zoom).toBeCloseTo(5);
        expect(Number(port.getAttribute('stroke-width')) * zoom).toBeCloseTo(1);
      }
      unmount();
    }
  });

  test('a resize handle is the same size on screen at any zoom', ({ expect }) => {
    for (const zoom of [0.25, 1, 4]) {
      const { container, unmount } = renderFrame(zoom, true);
      const handles = Array.from(container.querySelectorAll('rect.pointer-events-auto'));
      expect(handles).toHaveLength(8);
      for (const handle of handles) {
        expect(Number(handle.getAttribute('width')) * zoom).toBeCloseTo(8);
      }
      unmount();
    }
  });
});
