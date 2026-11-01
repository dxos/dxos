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
import { type Tool3D } from './tools.ts';

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

type StoryProps = {
  exemplar: (typeof EXEMPLARS_3D)[number] | 'overlap';
  /** Milliseconds before an intent reaches the document, as a host that stores it (ECHO) takes. */
  commitDelay?: number;
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
];

/**
 * Arranging a 3D exemplar in memory.
 * 1. Click selects (shift toggles); Move, Rotate or Scale puts a gizmo on the one selected element.
 * 2. Cube or Sphere places one where the pointer meets the ground; Link binds the next two clicked elements.
 * 3. Double-click a composite (the encapsulated cluster's shell) to edit its parts; Escape goes back out.
 * 4. Delete removes the selection; Orbit (or the middle button) orbits, shift or the right button pans, the wheel zooms.
 */
const DefaultStory = ({ exemplar, commitDelay }: StoryProps) => {
  const initial = useMemo(
    () => (exemplar === 'overlap' ? OVERLAP : Dsl.readScenes(EXEMPLARS[exemplar]).document),
    [exemplar],
  );
  const [document, setDocument] = useState<Scene.SceneDocument>(initial);
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool3D>('select');
  const [editing, setEditing] = useState<string>();
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
        {TOOLS.map((entry) => (
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
 * Extrude: a drag from a face of a cube extrudes it, drawn as the pointer moves, and the release makes the solid.
 *
 * Test:
 * 1. With Extrude, a press on a cube and a move away from it draw the extruded solid, not yet in the document.
 * 2. The release makes the `extrude` element, selected.
 */
export const Extrude: Story = {
  // Plain cubes: no solid or rounded cube loads Manifold before the first extrusion.
  args: { exemplar: 'overlap', commitDelay: 100 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('scene.3d.editor');
    await userEvent.click(canvas.getByTestId('tool-extrude'));
    const view = editor.querySelector('canvas');
    if (!view) {
      throw new Error('The editor has no canvas.');
    }
    const scene = () => EngineStore.Instances.find((engine) => engine.getRenderingCanvas() === view)?.scenes[0];
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

    // Every frame the preview is drawn in, so a stand-in drawn before the solid is built shows.
    const frames: string[] = [];
    scene()?.onAfterRenderObservable.add(() => {
      const drawn = bounds('item-extrude-1');
      drawn && frames.push(drawn);
    });

    // 1. The press captures the pointer, so its moves and release target the editor rather than the canvas under it.
    await fireEvent.pointerDown(view, { ...from, buttons: 1 });
    await fireEvent.pointerMove(editor, { ...to, buttons: 1 });
    await waitFor(() => expect(bounds('item-extrude-1')).toBeDefined());
    // Given time to build the solid, the preview is the solid the release makes, not a stand-in.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const preview = bounds('item-extrude-1');
    await expect(editor.dataset.selection).toBe('');
    await expect(new Set(frames)).toEqual(new Set([preview]));

    // 2.
    // Every frame from the release on draws the solid as previewed, while the document takes the commit and after.
    const released: (string | undefined)[] = [];
    scene()?.onAfterRenderObservable.add(() => released.push(bounds('item-extrude-1')));
    await fireEvent.pointerUp(editor, { ...to, buttons: 0 });
    await waitFor(() => expect(editor.dataset.selection).toBe('extrude-1'));
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await expect(new Set(released)).toEqual(new Set([preview]));
  },
};
