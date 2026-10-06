//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { createLatticeProjection } from '../../model/projections/lattice.ts';
import { createMemoryStore } from '../../model/store.ts';
import { SceneBuilder } from '../../utils/builder.ts';
import { DEFAULT_LATTICE, cellBounds } from '../../utils/lattice.ts';
import { DEFAULT_SHAPE_SIZE } from '../../utils/shapes.ts';
import { createClassSceneTree, createSceneTree } from '../../utils/testing.ts';
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
 * 6. G (or the Grid button) toggles the grid; with it off nothing snaps. The floating panel (top right) edits the
 *    selected element.
 */
type StoryArgs = {
  depth: number;
  liveDepth: number;
  readonly?: boolean;
  fixture?: 'elements' | 'classes' | 'square' | 'lattice';
};

type EditorProps = {
  store: ReturnType<typeof createMemoryStore>;
  root: string;
  liveDepth: number;
  readonly?: boolean;
  lattice?: boolean;
};

const Editor = ({ store, root, liveDepth, readonly, lattice }: EditorProps) => (
  <SceneView.Root
    store={store}
    root={root}
    readonly={readonly}
    createProjection={lattice ? createLatticeProjection : undefined}
  >
    <SceneView.Canvas liveDepth={liveDepth} />
    <SceneView.Navigation />
    <SceneView.Actions />
    <SceneView.Debug />
    <SceneView.Palette />
    <SceneView.Properties />
  </SceneView.Root>
);

/** One square centred on the origin: something to select and style straight away. */
const createSquareTree = () => {
  const root = 'scene:root';
  const scene = SceneBuilder.create(root, 'root')
    .rect(
      'square',
      { x: -DEFAULT_SHAPE_SIZE.width / 2, y: -DEFAULT_SHAPE_SIZE.height / 2, ...DEFAULT_SHAPE_SIZE },
      'DXOS',
    )
    .build();
  return { scenes: [scene], root };
};

/** Shapes on the default lattice: one-cell boxes and a three-cell bar, linked through the gutters. */
const createLatticeTree = () => {
  const root = 'scene:root';
  const at = (col: number, row: number, spanX = 1) => cellBounds({ col, row, spanX, spanY: 1 }, DEFAULT_LATTICE);
  const scene = SceneBuilder.create(root, 'root')
    .rect('a', at(-1, -1), 'A')
    .rect('b', at(1, -1), 'B')
    .rect('bar', at(-1, 1, 3), 'Bar')
    .line('ab', 'a', 'b')
    .line('a-bar', 'a', 'bar')
    .build();
  return { scenes: [scene], root };
};

const DefaultStory = ({ depth, liveDepth, readonly, fixture }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    // The class fixture is a fixed three levels, so `depth` does not apply to it.
    const tree =
      fixture === 'classes'
        ? createClassSceneTree()
        : fixture === 'square'
          ? createSquareTree()
          : fixture === 'lattice'
            ? createLatticeTree()
            : createSceneTree(depth);
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, [depth, fixture]);

  // Keyed on the root so a new tree remounts the editor, whose atoms are created on mount.
  return (
    <Editor
      key={root}
      store={store}
      root={root}
      liveDepth={liveDepth}
      readonly={readonly}
      lattice={fixture === 'lattice'}
    />
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/SceneView',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  // The properties panel is a react-ui-form form; its strings (e.g. "Mixed") and its controls' come from their bundles.
  parameters: { translations: [...uiTranslations, ...formTranslations] },
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

/** A single square at the origin: select it to style it, or draw more nodes and link them. */
export const Default: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'square' },
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

/**
 * Lattice mode (DESIGN §8b): shapes snap to whole cells of a 256x128 lattice with 128x64 gutters, span any number
 * of cells, and may not overlap; a drag onto occupied cells previews in red and is refused.
 */
export const Lattice: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'lattice' },
};
