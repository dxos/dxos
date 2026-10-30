//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type Scene } from '@dxos/scene';

import { type DimensionConfig, type ViewportProps } from './config.ts';
import { type EditorDisplay } from './context.ts';
import { type History } from './history.ts';
import { SceneEditor } from './SceneEditor.tsx';

const TestViewport = ({ children, grid, snap }: ViewportProps<{ zoom: number }>) => (
  <div data-testid='viewport' data-grid={grid} data-snap={snap}>
    {children}
  </div>
);

const config = (dim: Scene.Dimension): DimensionConfig<{ zoom: number }> => ({
  dim,
  viewport: TestViewport,
  tools: [
    { id: 'select', icon: 'ph--cursor--regular', label: 'Select', category: 'select' },
    { id: dim === '3d' ? 'cube' : 'rect', icon: 'ph--square--regular', label: 'Shape', category: 'create' },
  ],
  geometry: { pasteOffset: (pasted) => ({ x: pasted, y: pasted }), snap: { move: 1 } },
  camera: {
    fit: () => ({ zoom: 7 }),
    reset: (authored) => ({ zoom: authored.zoom * 3 }),
    zoom: (camera, factor) => ({ zoom: camera.zoom / factor }),
    percent: () => 100,
  },
  display: { themes: [{ id: 'default', label: 'Default' }], grids: ['lines'], guides: dim === '2d' },
  propertyForm: () => null,
});

const DOCUMENT: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'root', dim: '2d', elements: {} }],
  models: [],
};

const DISPLAY: EditorDisplay = { theme: 'default', grid: true, snap: false };

const Editor = ({
  dim,
  role,
  onDisplayChange,
  onCameraChange = () => {},
  refitKey,
}: {
  dim: Scene.Dimension;
  role?: string;
  onDisplayChange?: (display: Partial<EditorDisplay>) => void;
  onCameraChange?: (camera: { zoom: number }) => void;
  refitKey?: string | number;
}) => (
  <SceneEditor.Root
    config={config(dim)}
    document={DOCUMENT}
    scene='s'
    role={role}
    onIntent={() => {}}
    display={DISPLAY}
    onDisplayChange={onDisplayChange}
    camera={{ zoom: 1 }}
    authoredCamera={{ zoom: 1 }}
    onCameraChange={onCameraChange}
    refitKey={refitKey}
    onReadonlyChange={() => {}}
  >
    <SceneEditor.Viewport>
      <SceneEditor.Tools />
      <SceneEditor.Actions />
      <SceneEditor.Camera />
      <SceneEditor.Display />
      <SceneEditor.ContextMenu />
    </SceneEditor.Viewport>
  </SceneEditor.Root>
);

describe('SceneEditor', () => {
  afterEach(() => cleanup());

  test('both configs render the same regions', () => {
    const regions = () =>
      ['viewport', 'palette', 'scene-actions', 'canvas-debug', 'canvas-display'].map(
        (id) => screen.queryByTestId(id) !== null,
      );
    render(<Editor dim='2d' />);
    const twoD = regions();
    cleanup();
    render(<Editor dim='3d' />);
    expect(regions()).toEqual(twoD);
    expect(twoD.every(Boolean)).toBe(true);
  });

  test('card role renders the viewport only', () => {
    render(<Editor dim='3d' role='card' />);
    expect(screen.getByTestId('viewport')).toBeDefined();
    expect(screen.getByTestId('viewport').dataset.grid).toBe('false');
    for (const id of ['palette', 'scene-actions', 'canvas-debug', 'canvas-display']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  test('a viewport that reports its unchanged size after every render settles, editing or drawing a card', () => {
    for (const role of ['article', 'card']) {
      let renders = 0;
      const ResizingViewport = ({ children, onResize }: ViewportProps<{ zoom: number }>) => {
        renders++;
        // Reports from an effect that reruns each render, as the canvas does when handed a fresh callback; capped so a
        // loop fails the count rather than hanging the test.
        useEffect(() => {
          renders < 20 && onResize?.({ width: 400, height: 300 });
        });
        return <div data-testid='viewport'>{children}</div>;
      };
      render(
        <SceneEditor.Root
          config={{ ...config('2d'), viewport: ResizingViewport }}
          document={DOCUMENT}
          scene='s'
          role={role}
          onIntent={() => {}}
          display={DISPLAY}
          authoredCamera={{ zoom: 1 }}
        >
          <SceneEditor.Viewport />
        </SceneEditor.Root>,
      );
      expect(renders).toBeLessThan(10);
      cleanup();
    }
  });

  test('snap toggle is independent of the grid toggle', async () => {
    const onDisplayChange = vi.fn();
    render(<Editor dim='3d' onDisplayChange={onDisplayChange} />);
    await userEvent.click(screen.getByTestId('toolbar-snap'));
    expect(onDisplayChange).toHaveBeenLastCalledWith({ snap: true });
    await userEvent.click(screen.getByTestId('toolbar-axes'));
    expect(onDisplayChange).toHaveBeenLastCalledWith({ axes: true });
    expect(screen.getByTestId('viewport').dataset.grid).toBe('true');
  });

  test("Actual size returns to the dimension's reset camera, which frames the content at the authored scale", async () => {
    const onCameraChange = vi.fn();
    render(<Editor dim='2d' onCameraChange={onCameraChange} />);
    await userEvent.click(screen.getByTestId('toolbar-zoom-reset'));
    expect(onCameraChange).toHaveBeenLastCalledWith({ zoom: 3 });
  });

  test('a new refit key from the host frames the content, in either dimension; the first one does not', () => {
    for (const dim of ['2d', '3d'] as const) {
      const onCameraChange = vi.fn();
      const { rerender } = render(<Editor dim={dim} onCameraChange={onCameraChange} refitKey={1} />);
      expect(onCameraChange).not.toHaveBeenCalled();
      rerender(<Editor dim={dim} onCameraChange={onCameraChange} refitKey={2} />);
      expect(onCameraChange).toHaveBeenLastCalledWith({ zoom: 7 });
      cleanup();
    }
  });

  test("a viewport's transaction records its layout and model writes as one undo step", async () => {
    const record = vi.fn((change: () => void) => (change(), true));
    const recordDocument = vi.fn();
    const history: History = { canUndo: false, canRedo: false, record, recordDocument, undo: () => {}, redo: () => {} };
    const write = vi.fn();
    const writeModel = vi.fn(() => []);
    const PortalViewport = ({ onIntent, onModelIntent, onTransaction }: ViewportProps<{ zoom: number }>) => (
      <button
        data-testid='portal'
        onClick={() =>
          onTransaction?.(() => {
            onIntent('root', { kind: 'create', element: { id: 'p', object: 'o' } });
            onIntent('inside', { kind: 'create', element: { id: 'q', type: 'rect' } });
            onModelIntent?.({ kind: 'define', model: 'm', object: { id: 'o', type: 'view', parts: 'inside' } });
          })
        }
      />
    );
    render(
      <SceneEditor.Root
        config={{ ...config('2d'), viewport: PortalViewport }}
        document={DOCUMENT}
        scene='s'
        onIntent={write}
        history={history}
        onModelIntent={writeModel}
        readDocument={() => ({ ...DOCUMENT })}
        display={DISPLAY}
      >
        <SceneEditor.Viewport />
      </SceneEditor.Root>,
    );
    await userEvent.click(screen.getByTestId('portal'));
    expect(write).toHaveBeenCalledTimes(2);
    expect(writeModel).toHaveBeenCalledTimes(1);
    expect(record).not.toHaveBeenCalled();
    expect(recordDocument).toHaveBeenCalledTimes(1);
  });

  test('a press into the editor takes focus, and Cmd+Z right after an edit made by that press undoes, in 2D and 3D', () => {
    for (const dim of ['2d', '3d'] as const) {
      const undo = vi.fn();
      const history: History = {
        canUndo: true,
        canRedo: false,
        record: (change) => (change(), true),
        recordDocument: () => {},
        undo,
        redo: () => {},
      };
      const outside = globalThis.document.createElement('input');
      globalThis.document.body.appendChild(outside);
      outside.focus();
      const view = (document: Scene.SceneDocument) => (
        <SceneEditor.Root
          config={config(dim)}
          document={document}
          scene='s'
          onIntent={() => {}}
          history={history}
          display={DISPLAY}
        >
          <SceneEditor.Viewport />
        </SceneEditor.Root>
      );
      const { rerender } = render(view(DOCUMENT));
      const viewport = screen.getByTestId('viewport');
      fireEvent.pointerDown(viewport);
      expect(globalThis.document.activeElement).not.toBe(outside);
      // The press's drag writes the document, which rebuilds the command table.
      rerender(view({ ...DOCUMENT, layouts: [{ id: 'root', dim, elements: {} }] }));
      fireEvent.keyDown(globalThis.document.activeElement ?? viewport, { key: 'z', metaKey: true });
      expect(undo).toHaveBeenCalledTimes(1);
      cleanup();
      outside.remove();
    }
  });
});
