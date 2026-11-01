//
// Copyright 2026 DXOS.org
//

import { EngineStore } from '@babylonjs/core';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';
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
        b: { id: 'b', type: 'cube', center: { x: -0.4, y: 0.8, z: 0.4 } },
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

type StoryProps = {
  exemplar: (typeof EXEMPLARS_3D)[number] | 'overlap' | 'kit';
  /** Milliseconds before an intent reaches the document, as a host that stores it (ECHO) takes. */
  commitDelay?: number;
  /** The tool picked when the story opens. */
  initialTool?: Tool3D;
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
 * 4. Delete removes the selection; Orbit (or the middle button) orbits, shift or the right button pans, the wheel zooms.
 */
const DefaultStory = ({ exemplar, commitDelay, initialTool = 'select' }: StoryProps) => {
  const initial = useMemo(
    () => (exemplar === 'overlap' ? OVERLAP : exemplar === 'kit' ? KIT : Dsl.readScenes(EXEMPLARS[exemplar]).document),
    [exemplar],
  );
  const [document, setDocument] = useState<Scene.SceneDocument>(initial);
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool3D>(initialTool);
  const [editing, setEditing] = useState<string>();
  const [face, setFace] = useState<FaceSelection>();
  const scene = document.scenes[0];
  const onIntent = useCallback(
    (layout: string, intent: LayoutIntent) => {
      const apply = () =>
        setDocument((current) => ({
          ...current,
          layouts: current.layouts.map((record) => (record.id === layout ? applyIntent(record, intent) : record)),
        }));
      commitDelay === undefined ? apply() : setTimeout(apply, commitDelay);
    },
    [commitDelay],
  );
  if (!scene) {
    return null;
  }
  return (
    <div className='flex flex-col dx-fill'>
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
 * 1. Hover a cube: the cursor turns to the move arrows over any of its faces, and back to the arrow off it.
 * 2. Drag from a face: the solid grows out of that face as the pointer moves, and the release makes it, selected.
 * 3. Double-click a face: it is highlighted, and the cursor now changes only over that face; a drag anywhere extrudes it.
 * 4. Escape clears the selected face.
 */
export const Extrude: Story = {
  // Plain cubes: no solid or rounded cube loads Manifold before the first extrusion.
  args: { exemplar: 'overlap', initialTool: 'extrude' },
};

/**
 * Extrude, driven: a drag from a face of a cube extrudes it, drawn as the pointer moves, and the release makes the solid.
 *
 * Test:
 * 1. With Extrude, the cursor marks a cube's face under the pointer, and not open ground.
 * 2. A double-click on the face selects it, highlighted; Escape clears it.
 * 3. A press on a cube and a move away from it draw the extruded solid, not yet in the document.
 * 4. The release makes the `extrude` element, selected.
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
    const ground = { ...from, clientX: rect.left + 2, clientY: rect.top + 2 };
    await fireEvent.pointerMove(view, { ...ground, buttons: 0 });
    await waitFor(() => expect(editor).not.toHaveClass('cursor-move'));

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
  },
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
