//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type ViewportProps } from '@dxos/react-ui-canvas';
import { type Scene } from '@dxos/scene';

import { config3d, createConfig2D } from '../dimensions/index.ts';
import { type DimensionConfig } from './config.ts';
import { type EditorDisplay } from './context.ts';
import { type History } from './history.ts';
import { SceneEditor } from './SceneEditor.tsx';

const TestViewport = ({ children, grid, snap, theme }: ViewportProps<{ zoom: number }>) => (
  <div data-testid='viewport' data-grid={grid} data-snap={snap} data-theme={theme}>
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
  display: {
    themes: [
      { id: 'default', label: 'Default' },
      { id: 'other', label: 'Other' },
    ],
    grids: ['lines'],
    guides: dim === '2d',
  },
  propertyForm: () => null,
});

/** A camera for a dimension's real config under the test viewport. */
const CAMERA: Pick<DimensionConfig<{ zoom: number }>, 'viewport' | 'camera'> = {
  viewport: TestViewport,
  camera: config('2d').camera,
};

const DOCUMENT: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'root', dim: '2d', elements: {} }],
  models: [],
};

const DISPLAY: EditorDisplay = { theme: 'default', grid: true, snap: false };

const Editor = ({
  dim,
  role,
  readonly,
  onDisplayChange,
  onCameraChange = () => {},
  refitKey,
}: {
  dim: Scene.Dimension;
  role?: string;
  readonly?: boolean;
  onDisplayChange?: (display: Partial<EditorDisplay>) => void;
  onCameraChange?: (camera: { zoom: number }) => void;
  refitKey?: string | number;
}) => (
  <SceneEditor.Root
    config={config(dim)}
    document={DOCUMENT}
    scene='s'
    role={role}
    readonly={readonly}
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
      <SceneEditor.Navigation />
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
      ['viewport', 'canvas-toolbar', 'palette', 'scene-actions', 'canvas-debug', 'canvas-display'].map(
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
    for (const id of ['canvas-toolbar', 'palette', 'scene-actions', 'canvas-debug', 'canvas-display']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  test("a card, section or slide draws the authored view, framed to fit, never the viewer's own camera", () => {
    const seen: ({ zoom: number } | undefined)[] = [];
    const CameraViewport = ({ camera }: ViewportProps<{ zoom: number }>) => {
      seen.push(camera);
      return <div data-testid='viewport' />;
    };
    for (const role of ['card', 'section', 'slide', 'article']) {
      render(
        <SceneEditor.Root
          config={{ ...config('2d'), viewport: CameraViewport }}
          document={DOCUMENT}
          scene='s'
          role={role}
          onIntent={() => {}}
          display={DISPLAY}
          camera={{ zoom: 4 }}
          authoredCamera={{ zoom: 1 }}
        >
          <SceneEditor.Viewport />
        </SceneEditor.Root>,
      );
      expect(seen.at(-1)).toEqual(role === 'article' ? { zoom: 4 } : undefined);
      cleanup();
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

  test('the theme picker works in a read-only scene and, with no host to store the pick, switches the drawn theme', async () => {
    for (const dim of ['2d', '3d'] as const) {
      render(<Editor dim={dim} readonly />);
      const trigger = screen.getByTestId('theme-trigger');
      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('viewport').dataset.theme).toBe('default');
      await userEvent.click(trigger);
      await userEvent.click(await screen.findByTestId('theme-option-other'));
      expect(screen.getByTestId('viewport').dataset.theme).toBe('other');
      cleanup();
    }
  });

  test('each theme in the picker shows its swatch where there is a registry, and its light or dark icon, in 2D and 3D', async () => {
    const pick = async (dimension: DimensionConfig<{ zoom: number }>) => {
      render(
        <SceneEditor.Root
          config={{ ...dimension, viewport: TestViewport }}
          document={DOCUMENT}
          scene='s'
          onIntent={() => {}}
          display={{ ...DISPLAY, theme: dimension.display.themes[0]?.id ?? '' }}
        >
          <SceneEditor.Viewport>
            <SceneEditor.Display />
          </SceneEditor.Viewport>
        </SceneEditor.Root>,
      );
      await userEvent.click(screen.getByTestId('theme-trigger'));
    };
    const { viewport: _2d, camera: _c2, ...config2d } = createConfig2D();
    await pick({ ...config2d, ...CAMERA });
    expect(await screen.findByTestId('theme-swatch-paper')).toBeDefined();
    expect(screen.getByTestId('theme-option-paper').innerHTML).toContain('ph--sun--regular');
    expect(screen.getByTestId('theme-option-film').innerHTML).toContain('ph--moon--regular');
    cleanup();
    const { viewport: _3d, camera: _c3, ...rest3d } = config3d;
    await pick({ ...rest3d, ...CAMERA });
    expect((await screen.findByTestId('theme-option-neu-dark')).innerHTML).toContain('ph--moon--regular');
    expect(screen.getByTestId('theme-option-neu-light').innerHTML).toContain('ph--sun--regular');
  });

  test('a host that stores the theme takes the pick', async () => {
    const onDisplayChange = vi.fn();
    render(<Editor dim='2d' readonly onDisplayChange={onDisplayChange} />);
    await userEvent.click(screen.getByTestId('theme-trigger'));
    await userEvent.click(await screen.findByTestId('theme-option-other'));
    expect(onDisplayChange).toHaveBeenCalledWith({ themeOverride: 'other' });
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

  test('the zoom buttons zoom from the camera on screen, one the viewport chose itself included, and show its zoom', async () => {
    // A viewport that fits the view on open and reports that camera, which the host never stored.
    const FittingViewport = ({ children, onViewCamera }: ViewportProps<{ zoom: number }>) => {
      useEffect(() => onViewCamera?.({ zoom: 4 }), [onViewCamera]);
      return <div data-testid='viewport'>{children}</div>;
    };
    const onCameraChange = vi.fn();
    render(
      <SceneEditor.Root
        config={{
          ...config('2d'),
          viewport: FittingViewport,
          camera: { ...config('2d').camera, percent: (camera, authored) => (camera.zoom / authored.zoom) * 100 },
        }}
        document={DOCUMENT}
        scene='s'
        onIntent={() => {}}
        display={DISPLAY}
        authoredCamera={{ zoom: 1 }}
        onCameraChange={onCameraChange}
      >
        <SceneEditor.Viewport>
          <SceneEditor.Camera />
        </SceneEditor.Viewport>
      </SceneEditor.Root>,
    );
    expect(await screen.findByText('400%')).toBeDefined();
    await userEvent.click(screen.getByTestId('toolbar-zoom-in'));
    expect(onCameraChange).toHaveBeenLastCalledWith({ zoom: 5 });
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
  test("the config's constrain rewrites or refuses every write, and sees the snap toggle", () => {
    const write = vi.fn();
    const seen: boolean[] = [];
    let send: ViewportProps<{ zoom: number }>['onIntent'] = () => {};
    const CapturingViewport = ({ onIntent }: ViewportProps<{ zoom: number }>) => {
      send = onIntent;
      return null;
    };
    render(
      <SceneEditor.Root
        config={{
          ...config('2d'),
          viewport: CapturingViewport,
          // Refuses a delete and turns a move into one along x only.
          constrain: (layout, intent, { snap }) => {
            seen.push(snap);
            return layout.id !== 'root' || intent.kind === 'delete'
              ? undefined
              : intent.kind === 'move'
                ? { ...intent, delta: { x: intent.delta.x, y: 0 } }
                : intent;
          },
        }}
        document={DOCUMENT}
        scene='s'
        onIntent={write}
        display={{ ...DISPLAY, snap: true }}
      >
        <SceneEditor.Viewport />
      </SceneEditor.Root>,
    );
    send('root', { kind: 'move', ids: ['a'], delta: { x: 3, y: 4 } });
    send('root', { kind: 'delete', ids: ['a'] });
    expect(write.mock.calls).toEqual([['root', { kind: 'move', ids: ['a'], delta: { x: 3, y: 0 } }]]);
    expect(seen).toEqual([true, true]);
  });
});

/** Two levels of frames: the root holds `b`, whose layout holds `e`. */
const NESTED: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', name: 'Board', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    { id: 'root', dim: '2d', elements: {} },
    { id: 'b', dim: '2d', name: 'B', elements: {} },
    { id: 'e', dim: '2d', name: 'E', elements: {} },
  ],
  models: [],
};

/** A viewport that drills as a double-click or zoom would: into `layout`, by the editor's `onEdit`. */
const DrillingViewport = ({ children, path, onEdit }: ViewportProps<{ zoom: number }>) => (
  <div data-testid='viewport' data-path={(path ?? []).join(' ')}>
    {['b', 'e'].map((layout) => (
      <button
        key={layout}
        data-testid={`drill-${layout}`}
        onClick={() => onEdit([...(path && path.length > 0 ? path : ['root']), layout])}
      />
    ))}
    {children}
  </div>
);

const NestedEditor = ({ dim }: { dim: Scene.Dimension }) => (
  <SceneEditor.Root
    config={{ ...config(dim), viewport: DrillingViewport }}
    document={NESTED}
    scene='s'
    onIntent={() => {}}
    display={DISPLAY}
  >
    <SceneEditor.Viewport>
      <SceneEditor.Navigation />
    </SceneEditor.Viewport>
  </SceneEditor.Root>
);

describe('SceneEditor.Navigation', () => {
  afterEach(() => cleanup());

  test('the breadcrumbs follow every level drilled into, and the viewport is handed the whole path', async () => {
    for (const dim of ['2d', '3d'] as const) {
      render(<NestedEditor dim={dim} />);
      const crumbs = () => screen.getByTestId('canvas-toolbar').textContent;
      expect(screen.getByTestId('breadcrumb-root')).toBeDefined();
      await userEvent.click(screen.getByTestId('drill-b'));
      await userEvent.click(screen.getByTestId('drill-e'));
      expect(screen.getByTestId('viewport').dataset.path).toBe('root b e');
      expect(crumbs()).toContain('B');
      expect(crumbs()).toContain('E');
      cleanup();
    }
  });

  test("a crumb drills out to its level, Up by one, and the root crumb to the scene's own layout", async () => {
    render(<NestedEditor dim='2d' />);
    await userEvent.click(screen.getByTestId('drill-b'));
    await userEvent.click(screen.getByTestId('drill-e'));
    await userEvent.click(screen.getByTestId('toolbar-up'));
    expect(screen.getByTestId('viewport').dataset.path).toBe('root b');
    await userEvent.click(screen.getByTestId('drill-e'));
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByTestId('viewport').dataset.path).toBe('root b');
    await userEvent.click(screen.getByTestId('breadcrumb-root'));
    expect(screen.getByTestId('viewport').dataset.path).toBe('');
  });
});
