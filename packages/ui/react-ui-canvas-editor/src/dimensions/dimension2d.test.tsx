//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import React, { useContext, useLayoutEffect, useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { type Camera, DEFAULT_LATTICE, createCanvasAtoms } from '@dxos/react-ui-canvas';
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

  test('the display panel offers dots and lines, or on a lattice its cells and the grid, as the engine draws them', async () => {
    const config = createConfig2D();
    const display = { current: DISPLAY };
    const Host = ({ document }: { document: Scene.SceneDocument }) => {
      const [value, setValue] = useState(DISPLAY);
      display.current = value;
      return (
        <SceneEditor.Root
          config={config}
          document={document}
          scene='s'
          onIntent={() => {}}
          display={value}
          onDisplayChange={(next) => setValue((current) => ({ ...current, ...next }))}
          authoredCamera={AUTHORED}
          onCameraChange={() => {}}
        >
          <SceneEditor.Viewport>
            <SceneEditor.Display />
          </SceneEditor.Viewport>
        </SceneEditor.Root>
      );
    };
    const { unmount } = render(<Host document={DOCUMENT} />);
    await waitFor(() => expect(screen.getByTestId('theme-grid-dots')).toBeDefined());
    expect(screen.getByTestId('theme-grid-lines')).toBeDefined();
    expect(screen.queryByTestId('toolbar-guides')).toBeNull();
    await act(async () => screen.getByTestId('theme-grid-dots').click());
    await waitFor(() => expect(display.current).toMatchObject({ grid: true, gridKind: 'dots' }));
    // Pressing the one drawn turns the grid off: two buttons, three states.
    await act(async () => screen.getByTestId('theme-grid-dots').click());
    await waitFor(() => expect(display.current).toMatchObject({ grid: false }));
    await waitFor(() => expect(screen.getByTestId('theme-grid-dots').getAttribute('aria-pressed')).toBe('false'));
    expect(screen.getByTestId('theme-grid-lines').getAttribute('aria-pressed')).toBe('false');
    unmount();

    // A lattice switches between its cells (its guides) and the grid, which is what a shape snaps to.
    const lattice: Scene.SceneDocument = {
      ...DOCUMENT,
      layouts: DOCUMENT.layouts.map((layout) => ({ ...layout, lattice: DEFAULT_LATTICE })),
    };
    render(<Host document={lattice} />);
    await waitFor(() => expect(screen.getByTestId('toolbar-lattice')).toBeDefined());
    expect(screen.queryByTestId('theme-grid-dots')).toBeNull();
    expect(screen.queryByTestId('toolbar-guides')).toBeNull();
    // The display sets no guides, so the grid is drawn and snapped to.
    expect(screen.getByTestId('toolbar-lattice-grid').getAttribute('aria-pressed')).toBe('true');
    await act(async () => screen.getByTestId('toolbar-lattice').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: true }));
    expect(screen.getByTestId('toolbar-lattice').getAttribute('aria-pressed')).toBe('true');
    await act(async () => screen.getByTestId('toolbar-lattice-grid').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: false }));
    // Pressing the grid again turns it off, with no cells in its place; pressing it once more draws it again.
    await act(async () => screen.getByTestId('toolbar-lattice-grid').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: false, grid: false }));
    await waitFor(() => expect(screen.getByTestId('toolbar-lattice-grid').getAttribute('aria-pressed')).toBe('false'));
    expect(screen.getByTestId('toolbar-lattice').getAttribute('aria-pressed')).toBe('false');
    await act(async () => screen.getByTestId('toolbar-lattice-grid').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: false, grid: true, gridKind: 'lines' }));
    // The lattice pressed while it is on goes off too, and takes no grid with it.
    await act(async () => screen.getByTestId('toolbar-lattice').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: true }));
    await act(async () => screen.getByTestId('toolbar-lattice').click());
    await waitFor(() => expect(display.current).toMatchObject({ guides: false, grid: false }));
  });

  test('an aid the engine’s own key toggles reaches the host’s display, so the editor’s constrain reads it too', async () => {
    const atoms = createCanvasAtoms('root');
    const config = createConfig2D({ atoms });
    const display = { current: DISPLAY };
    const registry: { current?: Registry.AtomRegistry } = {};
    const Probe = () => {
      registry.current = useContext(RegistryContext);
      return null;
    };
    const Host = () => {
      const [value, setValue] = useState(DISPLAY);
      display.current = value;
      return (
        <SceneEditor.Root
          config={config}
          document={DOCUMENT}
          scene='s'
          onIntent={() => {}}
          display={value}
          onDisplayChange={(next) => setValue((current) => ({ ...current, ...next }))}
          authoredCamera={AUTHORED}
          onCameraChange={() => {}}
        >
          <Probe />
          <SceneEditor.Viewport />
        </SceneEditor.Root>
      );
    };
    render(<Host />);
    await waitFor(() => expect(registry.current?.get(atoms.snap)).toBe(true));
    // As the engine's G key does.
    await act(async () => registry.current?.set(atoms.snap, false));
    await waitFor(() => expect(display.current.snap).toBe(false));
  });
});
