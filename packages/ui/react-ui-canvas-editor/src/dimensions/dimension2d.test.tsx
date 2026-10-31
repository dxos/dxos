//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { useLayoutEffect } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { type Camera } from '@dxos/react-ui-canvas';
import { type Scene } from '@dxos/scene';

import { type EditorDisplay, SceneEditor, useSceneSelection } from '../editor/index.ts';
import { createConfig2D } from './config2d.tsx';

const DOCUMENT: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', center: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
        b: { id: 'b', type: 'rect', center: { x: 300, y: 0 }, size: { width: 100, height: 100 } },
      },
    },
  ],
  models: [],
};

const DISPLAY: EditorDisplay = { theme: 'flat', grid: true, snap: true };

const AUTHORED: Camera = { x: 0, y: 0, zoom: 1 };

/** Selects `ids` through the editor's Selection aspect once mounted. */
const Select = ({ ids }: { ids: readonly string[] }) => {
  const { commands } = useSceneSelection('Select');
  useLayoutEffect(() => commands.select(ids), []);
  return null;
};

/** happy-dom lays nothing out, so the viewport is given a size for the engine to fit and zoom in. */
const SIZE = { clientWidth: 800, clientHeight: 600 };

describe('the 2D dimension under SceneEditor', () => {
  const saved = Object.fromEntries(
    Object.keys(SIZE).map((key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)]),
  );
  beforeAll(() => {
    for (const [key, value] of Object.entries(SIZE)) {
      Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
    }
  });
  afterAll(() => {
    for (const [key, descriptor] of Object.entries(saved)) {
      descriptor && Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
  });
  afterEach(() => cleanup());

  test('the real 2D viewport draws the scene, selects what the editor selects, and its camera bar moves the engine', async () => {
    const config = createConfig2D();
    render(
      <SceneEditor.Root
        config={config}
        document={DOCUMENT}
        scene='s'
        onIntent={() => {}}
        display={DISPLAY}
        authoredCamera={AUTHORED}
        onCameraChange={() => {}}
      >
        <Select ids={['b']} />
        <SceneEditor.Viewport>
          <SceneEditor.Navigation />
          <SceneEditor.Camera />
        </SceneEditor.Viewport>
      </SceneEditor.Root>,
    );
    await waitFor(() => expect(screen.getByTestId('scene-view')).toBeDefined());
    await waitFor(() => expect(document.querySelector('[data-node-id="b"]')).not.toBeNull());
    // The engine draws the selection frame round what the editor selected.
    await waitFor(() => expect(document.querySelector('[data-selected-id="b"]')).not.toBeNull());
    await act(async () => screen.getByTestId('toolbar-zoom-in').click());
    await waitFor(() => expect(screen.getByText('125%')).toBeDefined(), { timeout: 2_000 });
    await act(async () => screen.getByTestId('toolbar-zoom-reset').click());
    await waitFor(() => expect(screen.getByText('100%')).toBeDefined(), { timeout: 2_000 });
    // Fit frames the content no larger than actual size, and a zoom after it stays rather than fitting again.
    await act(async () => screen.getByTestId('toolbar-zoom-in').click());
    await waitFor(() => expect(screen.getByText('125%')).toBeDefined(), { timeout: 2_000 });
    await act(async () => screen.getByTestId('toolbar-fit').click());
    await waitFor(() => expect(screen.getByText('100%')).toBeDefined(), { timeout: 2_000 });
    await act(async () => screen.getByTestId('toolbar-zoom-in').click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 600)));
    expect(screen.getByText('125%')).toBeDefined();
  });
});
