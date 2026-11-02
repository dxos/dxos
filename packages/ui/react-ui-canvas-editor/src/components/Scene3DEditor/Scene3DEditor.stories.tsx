//
// Copyright 2026 DXOS.org
//

import { EngineStore, Matrix, Vector3 } from '@babylonjs/core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';
import { type WorkPlane } from '@dxos/react-ui-canvas/3d';
import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { Scene3DEditor } from './Scene3DEditor.tsx';
import { type FaceSelection, type Tool3D } from './tools.ts';

const EXEMPLARS_3D = ['cube', 'cluster', 'encapsulated', 'hierarchy', 'solid'] as const;

/** Two cubes that intersect and two whose tops are coplanar: where a selection's outline and box must stay clean. */
const OVERLAP: Scene.SceneDocument = {
  scenes: [
    {
      id: 'overlap',
      dim: '3d',
      layout: 'overlap',
      camera: {
        target: { x: 1, y: 0, z: 0 },
        yaw: 30,
        pitch: 30,
        distance: 9,
        fov: 0.8,
        projection: 'perspective',
      },
    },
  ],
  layouts: [
    {
      id: 'overlap',
      dim: '3d',
      elements: {
        a: { id: 'a', type: 'cube', center: { x: -1, y: 0.5, z: 0 } },
        b: { id: 'b', type: 'cube', center: { x: -0.5, y: 0.75, z: 0.5 } },
        c: { id: 'c', type: 'cube', center: { x: 2, y: 0.5, z: 0 } },
        d: { id: 'd', type: 'cube', center: { x: 3, y: 0.5, z: 0 } },
      },
    },
  ],
  models: [],
};

/** A box two units long, one high and one deep, as a mesh: proportions a locked drag must keep. */
const CRATE_MESH = {
  key: 'crate',
  positions: [
    -1, -0.5, -0.5, 1, -0.5, -0.5, 1, 0.5, -0.5, -1, 0.5, -0.5, -1, -0.5, 0.5, 1, -0.5, 0.5, 1, 0.5, 0.5, -1, 0.5, 0.5,
  ],
  indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5],
};

/** One cube to the side, and a model whose crate keeps its proportions when placed. */
const KIT: Scene.SceneDocument = {
  scenes: [{ ...OVERLAP.scenes[0], id: 'kit', layout: 'kit' }],
  layouts: [
    { id: 'kit', dim: '3d', model: 'kit', elements: { c: { id: 'c', type: 'cube', center: { x: 3, y: 0.5, z: 0 } } } },
  ],
  models: [
    {
      id: 'kit',
      dim: '3d',
      objects: { crate: { id: 'crate', type: 'mesh', lockAspect: true, props: { mesh: CRATE_MESH } } },
    },
  ],
};

/** A cube with one to its side and one above, each a little off the grid: what a move or a pull snaps flush against. */
const FLUSH: Scene.SceneDocument = {
  scenes: [{ ...OVERLAP.scenes[0], id: 'flush', layout: 'flush' }],
  layouts: [
    {
      id: 'flush',
      dim: '3d',
      elements: {
        p: { id: 'p', type: 'cube', center: { x: 0, y: 0.5, z: 0 } },
        q: { id: 'q', type: 'cube', center: { x: 2.6, y: 0.5, z: 0 } },
        r: { id: 'r', type: 'cube', center: { x: 0, y: 2.6, z: 0 } },
      },
    },
  ],
  models: [],
};

type StoryProps = {
  exemplar: (typeof EXEMPLARS_3D)[number] | 'overlap' | 'kit' | 'flush';
  /** Milliseconds before an intent reaches the document, as a host that stores it (ECHO) takes. */
  commitDelay?: number;
  /** The tool picked when the story opens. */
  initialTool?: Tool3D;
  /** Draws the ground grid. */
  grid?: boolean;
  /** Gestures snap to the minor grid; holding Alt frees one. */
  snap?: boolean;
  /** The work plane, the ground when unset. */
  plane?: WorkPlane;
};

const TOOLS: { tool: Tool3D; icon: string; label: string }[] = [
  { tool: 'select', icon: SELECT_ICON, label: 'Select' },
  { tool: 'orbit', icon: HAND_ICON, label: 'Orbit' },
  { tool: 'move', icon: 'ph--arrows-out-cardinal--regular', label: 'Move' },
  { tool: 'rotate', icon: 'ph--arrow-clockwise--regular', label: 'Rotate' },
  { tool: 'scale', icon: 'ph--arrows-out--regular', label: 'Scale' },
  { tool: 'link', icon: 'ph--line-segment--regular', label: 'Link' },
  { tool: 'extrude', icon: 'ph--arrow-fat-line-up--regular', label: 'Extrude' },
  { tool: { create: 'cube' }, icon: 'ph--cube--regular', label: 'Cube' },
  { tool: { create: 'sphere' }, icon: 'ph--circle--regular', label: 'Sphere' },
  { tool: { place: 'crate' }, icon: 'ph--package--regular', label: 'Crate' },
];

/** Whether the document's model defines `object`, so a tool placing it has something to place. */
const defines = (document: Scene.SceneDocument, object: string) =>
  document.models.some((model) => model.objects[object] !== undefined);

/**
 * Arranging a 3D exemplar in memory.
 * 1. Click selects (shift toggles); Move, Rotate or Scale puts a gizmo on the one selected element.
 * 2. Cube or Sphere places one where the pointer meets the ground; Link binds the next two clicked elements.
 * 3. Double-click a composite (the encapsulated cluster's shell) to edit its parts; Escape goes back out. Double-click a
 *    plain element to select the face under the pointer, which Extrude then drags; Escape clears it.
 * 4. Escape clears the selection; Delete removes it; Orbit (or the middle button) orbits, shift or the right button pans, the wheel zooms.
 */
const DefaultStory = ({ exemplar, commitDelay, initialTool = 'select', grid, snap, plane }: StoryProps) => {
  const initial = useMemo(
    () =>
      exemplar === 'overlap'
        ? OVERLAP
        : exemplar === 'kit'
          ? KIT
          : exemplar === 'flush'
            ? FLUSH
            : Dsl.readScenes(EXEMPLARS[exemplar]).document,
    [exemplar],
  );
  // The document with what undo and redo step back and forward to, as the full editor's history does.
  const [history, setHistory] = useState<{
    document: Scene.SceneDocument;
    past: Scene.SceneDocument[];
    future: Scene.SceneDocument[];
  }>({ document: initial, past: [], future: [] });
  const { document } = history;
  const undo = useCallback(
    () =>
      setHistory(({ document, past, future }) =>
        past.length === 0
          ? { document, past, future }
          : { document: past[past.length - 1], past: past.slice(0, -1), future: [document, ...future] },
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setHistory(({ document, past, future }) =>
        future.length === 0
          ? { document, past, future }
          : { document: future[0], past: [...past, document], future: future.slice(1) },
      ),
    [],
  );
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool3D>(initialTool);
  const [editing, setEditing] = useState<string>();
  const [face, setFace] = useState<FaceSelection>();
  const scene = document.scenes[0];
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) => {
      const apply = () =>
        setHistory(({ document: current, past }) => ({
          document: {
            ...current,
            layouts: current.layouts.map((record) => (record.id === layout ? applyIntent(record, intent) : record)),
          },
          past: [...past, current],
          future: [],
        }));
      commitDelay === undefined ? apply() : setTimeout(apply, commitDelay);
    },
    [commitDelay],
  );
  if (!scene) {
    return null;
  }
  return (
    <div
      className='flex flex-col dx-fill'
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          event.shiftKey ? redo() : undo();
        }
      }}
    >
      <Toolbar.Root>
        {TOOLS.filter(
          ({ tool }) => typeof tool !== 'object' || !('place' in tool) || defines(document, tool.place),
        ).map((entry) => (
          <Button.Root
            key={entry.label}
            variant={JSON.stringify(entry.tool) === JSON.stringify(tool) ? 'primary' : 'ghost'}
            iconOnly
            icon={entry.icon}
            label={entry.label}
            data-testid={`tool-${entry.label.toLowerCase()}`}
            onClick={() => setTool(entry.tool)}
          />
        ))}
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--arrow-counter-clockwise--regular'
          label='Undo'
          data-testid='action-undo'
          disabled={history.past.length === 0}
          onClick={undo}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--arrow-clockwise--regular'
          label='Redo'
          data-testid='action-redo'
          disabled={history.future.length === 0}
          onClick={redo}
        />
      </Toolbar.Root>
      <Scene3DEditor
        classNames='grow'
        document={document}
        scene={scene.id}
        editing={editing}
        selection={selection}
        tool={tool}
        onSelect={setSelection}
        onIntent={onIntent}
        onEdit={setEditing}
        face={face}
        onFaceChange={setFace}
        grid={grid}
        snap={snap}
        plane={plane}
      />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/components/Scene3DEditor',
  component: DefaultStory,
  render: (args) => <DefaultStory key={args.exemplar} {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: { exemplar: { control: 'select', options: EXEMPLARS_3D } },
  args: { exemplar: 'encapsulated' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Overlapping: Story = { args: { exemplar: 'overlap' } };

/**
 * Extrude: Extrude picked, over plain cubes.
 *
 * Test:
 * 1. Hover a cube: the face under the pointer is outlined and the cursor turns to the move arrows; off it, neither.
 * 2. Drag from a face: the solid grows out of that face as the pointer moves, and the release makes it, selected.
 * 3. Double-click a face: it is highlighted, and the cursor now changes only over that face; a drag anywhere extrudes it.
 * 4. Escape clears the selected face.
 * 5. The ground grid shows, and an extrusion grows in minor grid steps; holding Alt frees it.
 */
export const Extrude: Story = {
  // Plain cubes: no solid or rounded cube loads Manifold before the first extrusion.
  args: { exemplar: 'overlap', initialTool: 'extrude', grid: true, snap: true },
};

/**
 * Extrude, driven: a drag from a face of a cube extrudes it, drawn as the pointer moves, and the release makes the solid.
 *
 * Test:
 * 1. With Extrude, the face under the pointer is outlined and the cursor marks it; on open ground, neither.
 * 2. A double-click on the face selects it, highlighted; Escape clears it.
 * 3. A press on a cube and a move away from it draw the extruded solid, not yet in the document.
 * 4. The release makes the `extrude` element, selected.
 * 5. Undo (⌘Z) takes the extrusion away, and redo (⇧⌘Z) brings it back.
 */
export const ExtrudeTest: Story = {
  args: { exemplar: 'overlap', commitDelay: 100 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    await userEvent.click(canvas.getByTestId('tool-extrude'));
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const scene = () =>
      EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1)
        ?.scenes[0];
    /** A drawn item's world bounds, rounded, as `minX,minY,minZ,maxX,maxY,maxZ`. */
    const bounds = (name: string) => {
      const box = scene()?.getMeshByName(name)?.getBoundingInfo().boundingBox;
      return (
        box && [...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].map((value) => value.toFixed(2)).join()
      );
    };
    // Nothing under the pointer is picked until the renderer has drawn the cubes.
    await waitFor(() => expect(bounds('item-c')).toBeDefined(), { timeout: 10_000 });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const { width, height } = view.getBoundingClientRect();
    const target = { x: 0, y: 0 };
    for (let y = 0; y < height && !target.x; y += 8) {
      for (let x = 0; x < width && !target.x; x += 8) {
        if (scene()?.pick(x, y)?.pickedMesh?.name === 'item-c') {
          Object.assign(target, { x, y });
        }
      }
    }
    const rect = view.getBoundingClientRect();
    const from = { clientX: rect.left + target.x, clientY: rect.top + target.y, button: 0, pointerId: 1 };
    const to = { ...from, clientX: from.clientX - 60, clientY: from.clientY - 60 };

    // 1.
    await fireEvent.pointerMove(view, { ...from, buttons: 0 });
    await waitFor(() => expect(editor).toHaveClass('cursor-move'));
    await waitFor(() => expect(scene()?.getMeshByName('face-hover-c')).toBeTruthy());
    await expect(scene()?.getMeshByName('face-hover-fill-c')).toBeTruthy();
    const ground = { ...from, clientX: rect.left + 2, clientY: rect.top + 2 };
    await fireEvent.pointerMove(view, { ...ground, buttons: 0 });
    await waitFor(() => expect(editor).not.toHaveClass('cursor-move'));
    await waitFor(() => expect(scene()?.getMeshByName('face-hover-c')).toBeFalsy());
    await expect(scene()?.getMeshByName('face-hover-fill-c')).toBeFalsy();

    // 2. Each press of the double-click starts a face drag, which captures the pointer, so the release and the
    // double-click land on the editor rather than the canvas.
    for (let click = 0; click < 2; click++) {
      await fireEvent.pointerDown(view, { ...from, buttons: 1 });
      await fireEvent.pointerUp(editor, { ...from, buttons: 0 });
    }
    await fireEvent.dblClick(editor, from);
    await waitFor(() => expect(scene()?.getMeshByName('face-c')).toBeTruthy());
    await expect(editor.dataset.selection).toBe('c');
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(scene()?.getMeshByName('face-c')).toBeFalsy());
    // A click on open ground clears the selection the double-click made.
    await fireEvent.pointerDown(view, { ...ground, buttons: 1 });
    await fireEvent.pointerUp(view, { ...ground, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe(''));

    // Every frame the preview is drawn in, so a stand-in drawn before the solid is built shows.
    const frames: string[] = [];
    scene()?.onAfterRenderObservable.add(() => {
      const drawn = bounds('item-extrude-1');
      drawn && frames.push(drawn);
    });

    // 3. The press captures the pointer, so its moves and release target the editor rather than the canvas under it.
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(bounds('item-extrude-1')).toBeDefined());
    // Given time to build the solid, the preview is the solid the release makes, not a stand-in.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const preview = bounds('item-extrude-1');
    await expect(editor.dataset.selection).toBe('');
    await expect(new Set(frames)).toEqual(new Set([preview]));

    // 4.
    // Every frame from the release on draws the solid as previewed, while the document takes the commit and after.
    const released: (string | undefined)[] = [];
    scene()?.onAfterRenderObservable.add(() => released.push(bounds('item-extrude-1')));
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('extrude-1'));
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await expect(new Set(released)).toEqual(new Set([preview]));

    // 5.
    await fireEvent.keyDown(editor, { key: 'z', metaKey: true });
    await waitFor(() => expect(bounds('item-extrude-1')).toBeUndefined());
    await fireEvent.keyDown(editor, { key: 'z', metaKey: true, shiftKey: true });
    await waitFor(() => expect(bounds('item-extrude-1')).toBe(preview));
  },
};

/**
 * Move, driven: a drag on the move gizmo moves the selected cube.
 *
 * Test:
 * 1. With Move, a click on a cube selects it and puts the gizmo on it.
 * 2. A drag from one of the gizmo's arrows moves the cube, which stays selected.
 */
/**
 * Selects `select` (cube c, the first, carries the gizmo) with the Move tool and drags the gizmo by `steps` of `stride` px
 * each way, checking the drag lasts; `landed` checks each selected cube's bounds before and after it.
 */
const dragGizmo =
  ({
    steps,
    stride = 10,
    select = ['c'],
    landed,
  }: {
    steps: number;
    stride?: number;
    select?: string[];
    landed?: (before: Record<string, string>, after: Record<string, string>) => Promise<void>;
  }) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const engine = () =>
      EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1);
    const scene = () => engine()?.scenes[0];
    /** A drawn item's world bounds, rounded, as `minX,minY,minZ,maxX,maxY,maxZ`. */
    const bounds = (name: string) => {
      const box = scene()?.getMeshByName(name)?.getBoundingInfo().boundingBox;
      return (
        box && [...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].map((value) => value.toFixed(2)).join()
      );
    };
    /** The pixels, on an 8px lattice, that `hits` accepts. */
    const findAll = (hits: (x: number, y: number) => boolean) => {
      const { width, height } = view.getBoundingClientRect();
      const found: { x: number; y: number }[] = [];
      for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
          hits(x, y) && found.push({ x, y });
        }
      }
      return found;
    };
    const find = (hits: (x: number, y: number) => boolean) => findAll(hits)[0];
    await waitFor(() => expect(bounds('item-c')).toBeDefined(), { timeout: 10_000 });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = view.getBoundingClientRect();
    const at = ({ x, y }: { x: number; y: number }) => ({
      clientX: rect.left + x,
      clientY: rect.top + y,
      pointerId: 1,
      button: 0,
    });

    // 1.
    for (const [index, id] of select.entries()) {
      const cube = find((x, y) => scene()?.pick(x, y)?.pickedMesh?.name === `item-${id}`);
      if (!cube) {
        throw new Error(`No pixel shows cube ${id}.`);
      }
      const shiftKey = index > 0;
      await fireEvent.pointerDown(view, { ...at(cube), buttons: 1, shiftKey });
      await fireEvent.pointerUp(view, { ...at(cube), buttons: 0, shiftKey });
    }
    await waitFor(() => expect(editor.dataset.selection).toBe(select.join(' ')));
    const boundsOf = () => Object.fromEntries(select.map((id) => [id, bounds(`item-${id}`) ?? '']));
    // The gizmo draws in a utility layer, a scene of its own beside the one the items are in; each handle is a group.
    const handleAt = (x: number, y: number) =>
      engine()
        ?._virtualScenes.map((layer) => layer.pick(x, y)?.pickedMesh?.parent?.parent?.uniqueId)
        .find((id) => id !== undefined);
    await waitFor(() => expect(find((x, y) => handleAt(x, y) !== undefined)).toBeDefined());
    const handles = new Map<number, { x: number; y: number }[]>();
    for (const pixel of findAll((x, y) => handleAt(x, y) !== undefined)) {
      const id = handleAt(pixel.x, pixel.y) ?? -1;
      handles.set(id, [...(handles.get(id) ?? []), pixel]);
    }
    const before = boundsOf();

    // 2. Babylon focuses its canvas on the press, and a drag lasts only while the canvas keeps the focus.
    // A handle at right angles to the drag on screen moves nothing, so each is tried, from its middle, until one does.
    for (const pixels of handles.values()) {
      const from = at(pixels[Math.floor(pixels.length / 2)]);
      await fireEvent.pointerMove(view, { ...from, buttons: 0 });
      await fireEvent.pointerDown(view, { ...from, buttons: 1 });
      for (let step = 1; step <= steps; step++) {
        await fireEvent.pointerMove(view, {
          ...from,
          clientX: from.clientX + step * stride,
          clientY: from.clientY + step * stride,
          buttons: 1,
        });
      }
      const end = steps * stride;
      await fireEvent.pointerUp(view, {
        ...from,
        clientX: from.clientX + end,
        clientY: from.clientY + end,
        buttons: 0,
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (bounds('item-c') !== before.c) {
        break;
      }
    }
    await waitFor(() => expect(bounds('item-c')).not.toBe(before.c));
    await expect(editor.dataset.selection).toBe(select.join(' '));
    await landed?.(before, boundsOf());
  };

export const MoveTest: Story = {
  args: { exemplar: 'overlap', initialTool: 'move' },
  play: dragGizmo({ steps: 6 }),
};

/**
 * With snapping on, a gizmo drag follows the pointer, held near a minor grid line, and lands the cube's low corner on the
 * minor grid along the axes it moved.
 */
export const MoveSnapTest: Story = {
  args: { exemplar: 'overlap', initialTool: 'move', grid: true, snap: true },
  // One long move: Babylon takes only the first move of a synthetic drag, which must carry the cube past several lines.
  play: dragGizmo({
    steps: 1,
    stride: 150,
    landed: async (before, after) => {
      const [from, to] = [before.c, after.c].map((value) => value.split(',').slice(0, 3).map(Number));
      const moved = to.filter((value, axis) => Math.abs(value - from[axis]) > 0.005);
      await expect(moved.length).toBeGreaterThan(0);
      for (const value of moved) {
        await expect(Math.abs(value * 4 - Math.round(value * 4))).toBeLessThan(0.04);
      }
    },
  }),
};

/** With two cubes selected the gizmo sits on the first, and a drag moves both by the same offset, both staying selected. */
export const MoveGroupTest: Story = {
  args: { exemplar: 'overlap', initialTool: 'move' },
  play: dragGizmo({
    steps: 6,
    select: ['c', 'd'],
    landed: async (before, after) => {
      const offset = (id: string) =>
        after[id].split(',').map((value, index) => (Number(value) - Number(before[id].split(',')[index])).toFixed(2));
      await expect(offset('d')).toEqual(offset('c'));
    },
  }),
};

/**
 * Drag to size: a create tool and a library object show the selection's box round the shape while it is dragged out,
 * and an object whose aspect is locked keeps its proportions.
 *
 * Test:
 * 1. With Cube, a drag on open ground draws the cube with its box before anything is in the document.
 * 2. With Crate, a drag draws the crate boxed, two long by one high and one deep however the drag runs.
 * 3. The release places the crate scaled evenly, and selects it.
 */
export const DragToSize: Story = {
  args: { exemplar: 'kit' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const scene = () =>
      EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1)
        ?.scenes[0];
    /** A drawn mesh's world extents along x, y and z, rounded. */
    const extents = (name: string) => {
      const box = scene()?.getMeshByName(name)?.getBoundingInfo().boundingBox;
      return (
        box &&
        box.maximumWorld
          .subtract(box.minimumWorld)
          .asArray()
          .map((value) => Number(value.toFixed(2)))
      );
    };
    await waitFor(() => expect(extents('item-c')).toBeDefined(), { timeout: 10_000 });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Open ground: left of the cube and nearer the camera, where nothing is under the pointer.
    const rect = view.getBoundingClientRect();
    const at = (x: number, y: number) => ({ clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, button: 0 });
    const from = at(rect.width * 0.25, rect.height * 0.6);
    // Down the screen as well as across, since the ground recedes: a shallow drag sweeps almost no depth.
    const to = { ...from, clientX: from.clientX + 120, clientY: from.clientY + 90 };
    await expect(scene()?.pick(from.clientX - rect.left, from.clientY - rect.top)?.pickedMesh?.name ?? '').not.toMatch(
      /^item-/,
    );

    // 1.
    await userEvent.click(canvas.getByTestId('tool-cube'));
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(extents('item-cube-1')).toBeDefined());
    await waitFor(() => expect(scene()?.getMeshByName('box-cube-1')).toBeTruthy());
    await expect(editor.dataset.selection).toBe('');
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(extents('item-cube-1')).toBeUndefined());

    // 2.
    await userEvent.click(canvas.getByTestId('tool-crate'));
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(extents('item-crate-1')).toBeDefined());
    await waitFor(() => expect(scene()?.getMeshByName('box-crate-1')).toBeTruthy());
    const [width = 0, height = 0, depth = 0] = extents('item-crate-1') ?? [];
    await expect(width / height).toBeCloseTo(2, 1);
    await expect(depth / height).toBeCloseTo(1, 1);

    // 3.
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('crate-1'));
    const [x = 0, y = 0, z = 0] = extents('item-crate-1') ?? [];
    await expect([x / y, z / y].map((ratio) => Number(ratio.toFixed(1)))).toEqual([2, 1]);
  },
};

/**
 * With snapping on, a swept base and a dragged height follow the pointer between minor grid lines, held only near one,
 * and the shape lands on the minor grid when the release fixes the base and the click fixes the height.
 */
export const DragToSizeSnapTest: Story = {
  args: { exemplar: 'kit', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const scene = () =>
      EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1)
        ?.scenes[0];
    /** The cube's world extents along x, y and z. */
    const extents = () => {
      const box = scene()?.getMeshByName('item-cube-1')?.getBoundingInfo().boundingBox;
      return box?.maximumWorld.subtract(box.minimumWorld).asArray();
    };
    const onGrid = (value: number) => Math.abs(value * 4 - Math.round(value * 4)) < 0.04;
    await waitFor(() => expect(scene()?.getMeshByName('item-c')).toBeTruthy(), { timeout: 10_000 });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = view.getBoundingClientRect();
    const at = (x: number, y: number) => ({ clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, button: 0 });
    const from = at(rect.width * 0.25, rect.height * 0.6);
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // 1. The base follows the pointer: some step of the sweep is between lines.
    await userEvent.click(canvas.getByTestId('tool-cube'));
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    const widths: number[] = [];
    for (let step = 1; step <= 12; step++) {
      await fireEvent.pointerMove(editor, {
        ...from,
        clientX: from.clientX + 60 + step * 7,
        clientY: from.clientY + 50,
        buttons: 1,
      });
      await frame();
      const [width] = extents() ?? [];
      width !== undefined && widths.push(width);
    }
    await expect(widths.some((width) => !onGrid(width))).toBe(true);

    // 2. The release lands the base on the minor grid.
    const release = { ...from, clientX: from.clientX + 60 + 12 * 7, clientY: from.clientY + 50 };
    await fireEvent.pointerUp(editor, { ...release, buttons: 0 });
    await frame();
    const [width = 0, , depth = 0] = extents() ?? [];
    await expect([onGrid(width), onGrid(depth)]).toEqual([true, true]);

    // 3. The height follows the pointer, and the click that fixes it lands it on the minor grid.
    const heights: number[] = [];
    for (let step = 1; step <= 12; step++) {
      await fireEvent.pointerMove(editor, { ...release, clientY: release.clientY - step * 20, buttons: 0 });
      await frame();
      const [, height] = extents() ?? [];
      height !== undefined && heights.push(height);
    }
    await expect(heights.some((height) => !onGrid(height))).toBe(true);
    const top = { ...release, clientY: release.clientY - 12 * 20 };
    await fireEvent.pointerDown(view, { ...top, buttons: 1 });
    await fireEvent.pointerUp(editor, { ...top, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('cube-1'));
    await waitFor(() => expect((extents() ?? []).every(onGrid)).toBe(true));
  },
};

/**
 * Click to create: with a create tool, a click on open ground (a little jitter included) makes the whole shape at its
 * default size, one major grid unit, resting on the ground and selected; only a drag sizes it.
 *
 * Test:
 * 1. With Cube, a press and a release 2px away create a one-unit cube on the ground, selected.
 * 2. Moving the pointer afterwards sizes nothing: the click left no height to set.
 * 3. With Sphere, a click creates a one-unit sphere.
 */
export const ClickCreateTest: Story = {
  args: { exemplar: 'kit', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const scene = () =>
      EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1)
        ?.scenes[0];
    /** A drawn mesh's world extents along x, y and z, and its lowest y, rounded. */
    const measure = (name: string) => {
      const box = scene()?.getMeshByName(name)?.getBoundingInfo().boundingBox;
      return (
        box && [
          ...box.maximumWorld
            .subtract(box.minimumWorld)
            .asArray()
            .map((value) => Number(value.toFixed(2))),
          Number(box.minimumWorld.y.toFixed(2)),
        ]
      );
    };
    await waitFor(() => expect(measure('item-c')).toBeDefined(), { timeout: 10_000 });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = view.getBoundingClientRect();
    const at = (x: number, y: number) => ({ clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, button: 0 });
    const click = async (point: ReturnType<typeof at>) => {
      const jitter = { ...point, clientX: point.clientX + 2, clientY: point.clientY + 1 };
      await fireEvent.pointerDown(view, { ...point, buttons: 1 });
      await fireEvent.pointerMove(editor, { ...jitter, buttons: 1 });
      await fireEvent.pointerUp(editor, { ...jitter, buttons: 0 });
    };
    const from = at(rect.width * 0.25, rect.height * 0.6);

    // 1.
    await userEvent.click(canvas.getByTestId('tool-cube'));
    await click(from);
    await waitFor(() => expect(editor.dataset.selection).toBe('cube-1'));
    await waitFor(() => expect(measure('item-cube-1')).toEqual([1, 1, 1, 0]));

    // 2.
    await fireEvent.pointerMove(editor, { ...from, clientY: from.clientY - 120, buttons: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(measure('item-cube-1')).toEqual([1, 1, 1, 0]);

    // 3.
    await userEvent.click(canvas.getByTestId('tool-sphere'));
    await click(at(rect.width * 0.25, rect.height * 0.8));
    await waitFor(() => expect(editor.dataset.selection).toBe('sphere-1'));
    await waitFor(() => expect(measure('item-sphere-1')).toEqual([1, 1, 1, 0]));
  },
};

/** The editor, its canvas and Babylon scene, and probes on them, once the scene has drawn `ready`. */
const harness = async (canvasElement: HTMLElement, ready: string) => {
  const canvas = within(canvasElement);
  const editor = await canvas.findByTestId('scene.3d.editor');
  const view = editor.querySelector('canvas');
  if (!view) {
    throw new Error('The editor has no canvas.');
  }
  const engine = () =>
    EngineStore.Instances.filter((engine) => engine.getRenderingCanvas() === view && !engine.isDisposed).at(-1);
  const scene = () => engine()?.scenes[0];
  /** A drawn mesh's world bounds, rounded, as `[minX, minY, minZ, maxX, maxY, maxZ]`. */
  const bounds = (name: string) => {
    const box = scene()?.getMeshByName(name)?.getBoundingInfo().boundingBox;
    return (
      box && [...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].map((value) => Number(value.toFixed(2)))
    );
  };
  await waitFor(() => expect(bounds(ready)).toBeDefined(), { timeout: 10_000 });
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await frame();
  const rect = view.getBoundingClientRect();
  /** The first pixel, on a 4px lattice, that `hits` accepts. */
  const find = (hits: (x: number, y: number) => boolean) => {
    for (let y = 0; y < rect.height; y += 4) {
      for (let x = 0; x < rect.width; x += 4) {
        if (hits(x, y)) {
          return { x, y };
        }
      }
    }
    throw new Error('No pixel matches.');
  };
  /** The item a pixel shows, and the outward normal there. */
  const pickAt = (x: number, y: number) => {
    const hit = scene()?.pick(x, y);
    return { name: hit?.pickedMesh?.name, normal: hit?.getNormal(true), point: hit?.pickedPoint };
  };
  /** Whether a pixel is on a gizmo or the face arrow, which draw in utility layers: scenes of their own. */
  const onGizmo = (x: number, y: number) =>
    engine()?._virtualScenes.some((layer) => layer.pick(x, y)?.hit === true) === true;
  /** Where a world point shows, in CSS pixels from the canvas's top left. */
  const toScreen = (point: Vector3) => {
    const current = scene();
    const camera = current?.activeCamera;
    const babylon = engine();
    if (!current || !camera || !babylon) {
      throw new Error('The scene is not drawn.');
    }
    const viewport = camera.viewport.toGlobal(babylon.getRenderWidth(), babylon.getRenderHeight());
    const projected = Vector3.Project(point, Matrix.IdentityReadOnly, current.getTransformMatrix(), viewport);
    return { x: projected.x * babylon.getHardwareScalingLevel(), y: projected.y * babylon.getHardwareScalingLevel() };
  };
  const at = ({ x, y }: { x: number; y: number }) => ({
    clientX: rect.left + x,
    clientY: rect.top + y,
    pointerId: 1,
    button: 0,
  });
  /** Pointer coordinates `world` units on from a pixel showing `from`, as the screen draws that step. */
  const along = (pixel: { x: number; y: number }, from: Vector3, world: Vector3) => {
    const start = toScreen(from);
    const end = toScreen(from.add(world));
    return at({ x: pixel.x + end.x - start.x, y: pixel.y + end.y - start.y });
  };
  return { canvas, editor, view, scene, bounds, frame, find, pickAt, onGizmo, toScreen, at, along };
};

const onGrid = (value: number) => Math.abs(value * 4 - Math.round(value * 4)) < 0.02;

/**
 * Extrude's arrow: a single-axis arrow stands on the face Extrude would pull, and pulling it extrudes that face.
 *
 * Test:
 * 1. With Extrude, hovering the top of a cube stands the arrow on the middle of that face.
 * 2. Moving the pointer onto the arrow keeps it there.
 * 3. A drag from the arrow pulls the face up, the arrow going with it, and the release makes the solid, selected.
 * 4. Another tool takes the arrow away.
 */
export const FaceArrowTest: Story = {
  args: { exemplar: 'flush', initialTool: 'extrude', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const probe = await harness(canvasElement, 'item-p');
    const { editor, view, scene, bounds, find, pickAt, onGizmo, at, along } = probe;
    const arrow = () => {
      const node = scene()?.getTransformNodeByName('face-arrow');
      return node ? node.position.asArray().map((value) => Number(value.toFixed(2))) : undefined;
    };
    const top = find((x, y) => {
      const { name, normal } = pickAt(x, y);
      return name === 'item-p' && (normal?.y ?? 0) > 0.9;
    });

    // 1.
    await fireEvent.pointerMove(view, { ...at(top), buttons: 0 });
    await waitFor(() => expect(arrow()).toEqual([0, 1, 0]));

    // 2.
    const handle = find(onGizmo);
    await fireEvent.pointerMove(view, { ...at(handle), buttons: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(arrow()).toEqual([0, 1, 0]);

    // 3. The press captures the pointer, so its moves and release target the editor.
    const to = along(handle, new Vector3(0, 1, 0), new Vector3(0, 0.5, 0));
    await fireEvent.pointerDown(view, { ...at(handle), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(arrow()?.[1]).toBeGreaterThan(1.3));
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('extrude-1'));
    await expect(bounds('item-extrude-1')?.[4]).toBe(1.5);

    // 4.
    await userEvent.click(probe.canvas.getByTestId('tool-select'));
    await waitFor(() => expect(arrow()).toBeUndefined());
  },
};

/**
 * Move by dragging a body: with Move, a drag on a cube (not on the gizmo) slides it on the ground's plane through where it
 * was grabbed, selecting it, and lands it on the minor grid as one undo step.
 *
 * Test:
 * 1. A click on a cube selects it and moves nothing.
 * 2. A drag on another cube selects that one as it goes and slides it across the ground, never up or down.
 * 3. The release lands its low corner on the minor grid.
 * 4. One undo puts it back.
 */
export const MoveBodyTest: Story = {
  args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { editor, view, bounds, frame, find, pickAt, onGizmo, at, along } = await harness(canvasElement, 'item-p');
    const start = { p: bounds('item-p'), q: bounds('item-q') };

    // 1.
    const onQ = find((x, y) => pickAt(x, y).name === 'item-q');
    await fireEvent.pointerDown(view, { ...at(onQ), buttons: 1 });
    await fireEvent.pointerUp(editor, { ...at(onQ), buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('q'));
    await frame();
    await expect(bounds('item-q')).toEqual(start.q);

    // 2.
    const grab = find((x, y) => pickAt(x, y).name === 'item-p' && !onGizmo(x, y));
    const point = pickAt(grab.x, grab.y).point;
    if (!point) {
      throw new Error('No point under the grab.');
    }
    const to = along(grab, point, new Vector3(0.9, 0, 0.3));
    await fireEvent.pointerDown(view, { ...at(grab), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(editor.dataset.selection).toBe('p'));
    await waitFor(() => expect(bounds('item-p')?.[0]).toBeGreaterThan(0.2));
    await expect(bounds('item-p')?.[1]).toBe(0);

    // 3.
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await frame();
    const [minX = 0, minY, minZ = 0] = bounds('item-p') ?? [];
    await expect([onGrid(minX), minY, onGrid(minZ)]).toEqual([true, 0, true]);
    await expect(minX).toBeCloseTo(0.5, 1);
    await expect(editor.dataset.selection).toBe('p');

    // 4.
    await fireEvent.keyDown(editor, { key: 'z', metaKey: true });
    await waitFor(() => expect(bounds('item-p')).toEqual(start.p));
  },
};

/**
 * Escape backs out of whatever is innermost, as in 2D: a drag, then the selection.
 *
 * Test:
 * 1. A click on a cube selects it; Escape clears the selection.
 * 2. Escape part way through a body drag puts the cube back and keeps it selected; the release then moves nothing.
 * 3. Escape again clears the selection.
 * 4. Escape part way through an extrusion drops it; the release then makes nothing.
 */
export const EscapeTest: Story = {
  args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { canvas, editor, view, bounds, frame, find, pickAt, onGizmo, at, along } = await harness(
      canvasElement,
      'item-p',
    );
    const start = bounds('item-p');

    // 1.
    const onQ = find((x, y) => pickAt(x, y).name === 'item-q');
    await fireEvent.pointerDown(view, { ...at(onQ), buttons: 1 });
    await fireEvent.pointerUp(editor, { ...at(onQ), buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('q'));
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(editor.dataset.selection).toBe(''));

    // 2.
    const grab = find((x, y) => pickAt(x, y).name === 'item-p' && !onGizmo(x, y));
    const point = pickAt(grab.x, grab.y).point;
    if (!point) {
      throw new Error('No point under the grab.');
    }
    const to = along(grab, point, new Vector3(0.9, 0, 0.3));
    await fireEvent.pointerDown(view, { ...at(grab), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(bounds('item-p')?.[0]).toBeGreaterThan(0.2));
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(bounds('item-p')).toEqual(start));
    await expect(editor.dataset.selection).toBe('p');
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await frame();
    await expect(bounds('item-p')).toEqual(start);
    await expect(editor.dataset.selection).toBe('p');

    // 3.
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(editor.dataset.selection).toBe(''));

    // 4.
    await userEvent.click(canvas.getByTestId('tool-extrude'));
    const top = find((x, y) => {
      const { name, normal } = pickAt(x, y);
      return name === 'item-p' && (normal?.y ?? 0) > 0.9 && !onGizmo(x, y);
    });
    const pull = along(top, new Vector3(0, 1, 0), new Vector3(0, 0.5, 0));
    await fireEvent.pointerMove(view, { ...at(top), buttons: 0 });
    await fireEvent.pointerDown(view, { ...at(top), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...pull, buttons: 1 });
    await waitFor(() => expect(bounds('item-extrude-1')).toBeDefined());
    await fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() => expect(bounds('item-extrude-1')).toBeUndefined());
    await fireEvent.pointerUp(editor, { ...pull, buttons: 0 });
    await frame();
    await expect(bounds('item-extrude-1')).toBeUndefined();
    await expect(editor.dataset.selection).toBe('');
  },
};

/**
 * Snapping against other bodies: Move picked, over a cube with one to its side and one above, each a little off the grid.
 *
 * Test:
 * 1. Drag cube p by its body: nothing lights up until the pointer is over another body; then that face is amber, and
 *    near one of its corners, edge middles or centre that point is marked and p's grab point is held on it.
 * 2. While dragging, hold X, Y or Z: p moves along that axis alone, drawn in its colour; let go to slide on the plane again.
 * 3. Drag p's gizmo x arrow towards q: it is held against q, q's side amber.
 * 4. With Extrude, an arrow stands on the face under the pointer; pull p's top up towards r: held against r's underside.
 * 5. Holding Alt frees each gesture from the grid and other bodies.
 */
export const Flush: Story = { args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true } };

/**
 * Flush snapping on a pull: a face pulled near a side of another body is held flush on it, ahead of the grid, and that
 * side is drawn in the snap colour while it holds.
 *
 * Test:
 * 1. Pulling p's top face up towards cube r above holds it against r's underside, shown; the release makes it so.
 */
export const FlushTest: Story = {
  args: { exemplar: 'flush', initialTool: 'extrude', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { editor, view, scene, bounds, find, pickAt, at, along } = await harness(canvasElement, 'item-q');
    const shown = (name: string) => scene()?.getMeshByName(name) !== null;

    // 1.
    const top = find((x, y) => {
      const { name, normal } = pickAt(x, y);
      return name === 'item-p' && (normal?.y ?? 0) > 0.9;
    });
    const face = pickAt(top.x, top.y).point;
    if (!face) {
      throw new Error('No point on the top face.');
    }
    const up = along(top, face, new Vector3(0, 1.07, 0));
    await fireEvent.pointerDown(view, { ...at(top), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...up, buttons: 1 });
    await waitFor(() => expect(shown('snap-r')).toBe(true));
    await fireEvent.pointerUp(editor, { ...up, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('extrude-1'));
    await expect(bounds('item-extrude-1')?.[4]).toBe(2.1);
    await expect(shown('snap-r')).toBe(false);
  },
};

/**
 * Hover snapping on a body drag: only what the pointer is over magnetises, and is drawn in the snap colour; a body that
 * merely lines up with the dragged one is not.
 *
 * Test:
 * 1. Dragging p by the middle of its top over open ground shows nothing, though p lines up with q and r.
 * 2. With the pointer near a corner of q's top, q's top and that corner are shown, and p's grab point is held on it.
 * 3. The release leaves p there and clears what was shown.
 */
export const HoverSnapTest: Story = {
  args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { editor, view, scene, bounds, frame, pickAt, toScreen, at, along } = await harness(canvasElement, 'item-q');
    const shown = (name: string) => scene()?.getMeshByName(name) !== null;
    // p is grabbed by the middle of its top.
    const middle = new Vector3(0, 1, 0);
    const { x, y } = toScreen(middle);
    const pixel = { x: Math.round(x), y: Math.round(y) };
    await expect(pickAt(pixel.x, pixel.y).name).toBe('item-p');

    // 1.
    const aside = along(pixel, middle, new Vector3(-0.6, 0, 0.9));
    await fireEvent.pointerDown(view, { ...at(pixel), buttons: 1 });
    await fireEvent.pointerMove(editor, { ...aside, buttons: 1 });
    await waitFor(() => expect(bounds('item-p')?.[0]).toBeLessThan(-0.8));
    await frame();
    await expect([shown('snap-q'), shown('snap-r'), shown('snap-point')]).toEqual([false, false, false]);

    // 2. A little inside the corner, so the pick lands on q's top.
    const corner = along(pixel, middle, new Vector3(2.15, 0, 0.45));
    await fireEvent.pointerMove(editor, { ...corner, buttons: 1 });
    await waitFor(() => expect(shown('snap-point')).toBe(true));
    await expect(shown('snap-q')).toBe(true);
    // The grab is a pixel's width from the middle, so p sits that far from corner to middle: off the grid all the same.
    const onCorner = () => {
      const [minX = 0, minY, minZ = 0] = bounds('item-p') ?? [];
      return [Math.abs(minX - 1.6) < 0.03, minY, Math.abs(minZ) < 0.03];
    };
    await expect(onCorner()).toEqual([true, 0, true]);

    // 3.
    await fireEvent.pointerUp(editor, { ...corner, buttons: 0 });
    await frame();
    await expect(onCorner()).toEqual([true, 0, true]);
    await expect([shown('snap-q'), shown('snap-point')]).toEqual([false, false]);
  },
};

/**
 * Holding an axis key on a body drag: X, Y or Z holds the body to that world axis through where it was grabbed, drawn
 * in the axis's colour.
 *
 * Test:
 * 1. With Y held, a drag up and across raises p straight up, the y axis drawn through the grab.
 * 2. The release lands its bottom on the minor grid, x and z unchanged, and the axis goes.
 * 3. With X held, a drag across and back moves p along x alone.
 */
export const AxisHoldTest: Story = {
  args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { editor, view, scene, bounds, frame, find, pickAt, onGizmo, at, along } = await harness(
      canvasElement,
      'item-q',
    );
    const shown = (name: string) => scene()?.getMeshByName(name) !== null;
    const press = find((x, y) => pickAt(x, y).name === 'item-p' && !onGizmo(x, y));
    const grab = pickAt(press.x, press.y).point;
    if (!grab) {
      throw new Error('No point under the grab.');
    }

    // 1.
    await fireEvent.pointerDown(view, { ...at(press), buttons: 1 });
    await fireEvent.keyDown(window, { key: 'y' });
    const raised = along(press, grab, new Vector3(0.5, 0.8, 0));
    await fireEvent.pointerMove(editor, { ...raised, buttons: 1 });
    await waitFor(() => expect(bounds('item-p')?.[1]).toBeGreaterThan(0.4));
    await expect(shown('axis-guide')).toBe(true);
    await expect([bounds('item-p')?.[0], bounds('item-p')?.[2]]).toEqual([-0.5, -0.5]);

    // 2.
    await fireEvent.pointerUp(editor, { ...raised, buttons: 0 });
    await fireEvent.keyUp(window, { key: 'y' });
    await frame();
    const [minX, minY = 0, minZ] = bounds('item-p') ?? [];
    await expect([minX, onGrid(minY), minY > 0.4, minZ]).toEqual([-0.5, true, true, -0.5]);
    await expect(shown('axis-guide')).toBe(false);

    // 3.
    const again = find((x, y) => pickAt(x, y).name === 'item-p' && !onGizmo(x, y));
    const point = pickAt(again.x, again.y).point;
    if (!point) {
      throw new Error('No point under the grab.');
    }
    const before = bounds('item-p') ?? [];
    await fireEvent.pointerDown(view, { ...at(again), buttons: 1 });
    await fireEvent.keyDown(window, { key: 'x' });
    const across = along(again, point, new Vector3(-1, 0.6, 0.7));
    await fireEvent.pointerMove(editor, { ...across, buttons: 1 });
    await fireEvent.pointerUp(editor, { ...across, buttons: 0 });
    await fireEvent.keyUp(window, { key: 'x' });
    await frame();
    const after = bounds('item-p') ?? [];
    // A pointer off the x axis moves p to the nearest point of the axis to it, short of its whole offset.
    await expect(after[0]).toBeLessThan((before[0] ?? 0) - 0.2);
    await expect([after[1], after[2]]).toEqual([before[1], before[2]]);
  },
};

/**
 * Flush snapping on a gizmo: a drag on the move gizmo's x arrow holds the cube against a side of another body it passes
 * near, ahead of the grid, and lands it there.
 *
 * Test:
 * 1. With Move, a click on cube p selects it and puts the gizmo on it.
 * 2. Dragging the gizmo's x arrow towards cube q lands p against q.
 */
export const GizmoFlushTest: Story = {
  args: { exemplar: 'flush', initialTool: 'move', grid: true, snap: true },
  play: async ({ canvasElement }) => {
    const { editor, view, scene, bounds, frame, find, pickAt, at, along } = await harness(canvasElement, 'item-q');
    const engine = () => scene()?.getEngine();

    // 1.
    const onP = find((x, y) => pickAt(x, y).name === 'item-p');
    await fireEvent.pointerDown(view, { ...at(onP), buttons: 1 });
    await fireEvent.pointerUp(view, { ...at(onP), buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('p'));
    await frame();

    // 2. Each handle is tried, from where it is pressed, until the one along x carries p.
    const handleAt = (x: number, y: number) =>
      engine()
        ?._virtualScenes.map((layer) => layer.pick(x, y))
        .find((hit) => hit?.hit && hit.pickedMesh?.parent?.parent);
    const handles = new Map<number, { x: number; y: number; point: Vector3 }>();
    const { width, height } = view.getBoundingClientRect();
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const hit = handleAt(x, y);
        const id = hit?.pickedMesh?.parent?.parent?.uniqueId;
        id !== undefined && hit?.pickedPoint && !handles.has(id) && handles.set(id, { x, y, point: hit.pickedPoint });
      }
    }
    await expect(handles.size).toBeGreaterThan(0);
    const start = bounds('item-p');
    for (const { x, y, point } of handles.values()) {
      const to = along({ x, y }, point, new Vector3(1.57, 0, 0));
      await fireEvent.pointerMove(view, { ...at({ x, y }), buttons: 0 });
      await fireEvent.pointerDown(view, { ...at({ x, y }), buttons: 1 });
      await fireEvent.pointerMove(view, { ...to, buttons: 1 });
      await fireEvent.pointerUp(view, { ...to, buttons: 0 });
      await frame();
      const moved = bounds('item-p');
      if (moved?.[3] === 2.1 && moved[1] === start?.[1] && moved[2] === start?.[2]) {
        break;
      }
      if (JSON.stringify(moved) !== JSON.stringify(start)) {
        await fireEvent.keyDown(editor, { key: 'z', metaKey: true });
        await waitFor(() => expect(bounds('item-p')).toEqual(start));
      }
    }
    await expect(bounds('item-p')?.[3]).toBe(2.1);
  },
};

/**
 * A raised work plane: the grid is drawn a unit up, and what a click or a drag makes stands on it.
 *
 * Test:
 * 1. The grid lies one unit above the ground.
 * 2. With Cube, a click on open space makes a one-unit cube standing on the raised plane.
 * 3. A drag sweeps a base on the raised plane, and the shape made over it stands on it.
 */
export const WorkPlaneTest: Story = {
  args: {
    exemplar: 'kit',
    grid: true,
    snap: true,
    plane: { origin: { x: 0, y: 1, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
  },
  play: async ({ canvasElement }) => {
    const probe = await harness(canvasElement, 'item-c');
    const { editor, view, scene, bounds, frame, at } = probe;
    const rect = view.getBoundingClientRect();

    // 1.
    await waitFor(() => expect(scene()?.getMeshByName('grid')?.position.y).toBe(1));

    // 2.
    await userEvent.click(probe.canvas.getByTestId('tool-cube'));
    const open = at({ x: rect.width * 0.25, y: rect.height * 0.6 });
    await fireEvent.pointerDown(view, { ...open, buttons: 1 });
    await fireEvent.pointerUp(editor, { ...open, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('cube-1'));
    await waitFor(() => expect(bounds('item-cube-1')?.[1]).toBe(1));

    // 3. A sphere sizes from its base alone, so one drag makes it.
    await userEvent.click(probe.canvas.getByTestId('tool-sphere'));
    const from = at({ x: rect.width * 0.2, y: rect.height * 0.85 });
    const to = { ...from, clientX: from.clientX + 60, clientY: from.clientY + 30 };
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await frame();
    await waitFor(() => expect(editor.dataset.selection).toBe('sphere-1'));
    await expect(bounds('item-sphere-1')?.[1]).toBe(1);
  },
};
