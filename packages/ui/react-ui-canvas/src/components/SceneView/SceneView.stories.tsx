//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { useSceneProjection } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { createMemoryStore } from '../../model/store.ts';
import { createClassSceneTree, createSceneTree } from '../../utils/testing.ts';
import { Properties } from '../Properties/index.ts';
import { SceneView } from './SceneView.tsx';

/**
 * Test:
 * 1. Ctrl/cmd+wheel zooms about the cursor; wheel or hand-tool drag pans; drag on empty canvas draws a marquee.
 * 2. Click selects, shift-click toggles; drag moves the selection (snapped); handles resize a single node.
 *    Hovering a node shows its ports; drag from a port onto a node or port links (with the last link type picked).
 * 3. L / K / P pick the line, curve or spline link tool: every port shows; dropping onto empty canvas creates a
 *    rectangle and links to it. A selected spline shows a diamond per control point and a dot per span midpoint:
 *    drag a diamond to move a point, drag a dot to add one there, alt-click a diamond to remove one.
 * 4. R / E / C / T / S then drag draws a rectangle, ellipse, UML class, text or nested scene; Delete removes the
 *    selection (nodes or links).
 * 5. Double-click a portal (or zoom until it fills the view) drills in; Escape, Up or the breadcrumb drills out.
 * 6. G (or the Grid button) toggles the grid; with it off nothing snaps. The right panel edits the selected element.
 */
type StoryArgs = { depth: number; liveDepth: number; readonly?: boolean; fixture?: 'elements' | 'classes' };

type EditorProps = {
  store: ReturnType<typeof createMemoryStore>;
  root: string;
  liveDepth: number;
  readonly?: boolean;
};

const Editor = ({ store, root, liveDepth, readonly }: EditorProps) => {
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  const projection = useSceneProjection({ store, atoms });
  return (
    <div className='dx-fill grid grid-cols-[1fr_20rem]'>
      <SceneView.Root store={store} root={root} atoms={atoms} readonly={readonly}>
        <SceneView.Canvas liveDepth={liveDepth} />
        <SceneView.Navigation />
        <SceneView.Actions />
        <SceneView.Debug />
        <SceneView.Palette />
      </SceneView.Root>
      <Properties projection={projection} atoms={atoms} readonly={readonly} classNames='border-l border-separator' />
    </div>
  );
};

const DefaultStory = ({ depth, liveDepth, readonly, fixture }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    // The class fixture is a fixed three levels, so `depth` does not apply to it.
    const tree = fixture === 'classes' ? createClassSceneTree() : createSceneTree(depth);
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, [depth, fixture]);

  // Keyed on the root so a new tree remounts the editor, whose atoms are created on mount.
  return <Editor key={root} store={store} root={root} liveDepth={liveDepth} readonly={readonly} />;
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/SceneView',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    depth: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Levels of nested scenes in the fixture; 0 is an empty scene',
    },
    liveDepth: {
      control: { type: 'range', min: 0, max: 4, step: 1 },
      description: 'Nested levels rendered live below the root; deeper portals are previews',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** An empty canvas: draw the first node, then link it. */
export const Default: Story = {
  args: { depth: 0, liveDepth: 1 },
};

/** One scene, no portals: selection, move, resize, linking and the palette. */
export const Freehand: Story = {
  args: { depth: 1, liveDepth: 1 },
};

/** Four levels of portals: drill in and out, tiers, auto drill; `liveDepth` sets how many levels render live. */
export const Nested: Story = {
  args: { depth: 4, liveDepth: 1 },
};

/** The same scene to look at: select, pan, zoom and drill, but no handle, port, tool or key changes it. */
export const Readonly: Story = {
  args: { depth: 1, liveDepth: 1, readonly: true },
};

/** A three-level class model: drill into a subsystem's portal to open its own classes. */
export const Classes: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'classes' },
};
