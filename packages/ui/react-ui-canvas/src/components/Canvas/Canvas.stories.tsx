//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type InspectorMode, createLatticeProjection } from '../../engine/index.ts';
import { type BackgroundGrid, createMemoryStore } from '../../model/index.ts';
import {
  createFrameTree,
  createLatticeTree,
  createModelSceneTree,
  createNestedDeepTree,
  createNestedSimpleTree,
  createSceneTree,
  createSquareTree,
} from '../../testing/index.ts';
import { Canvas } from './Canvas.tsx';

/**
 * Test:
 * 1. Pinch or ctrl/cmd+wheel zooms about the cursor, as does a mouse wheel; a trackpad swipe or hand-tool drag pans; drag on empty canvas draws a marquee.
 * 2. Click selects, shift-click toggles; drag moves the selection (snapped); handles resize a single node.
 *    Hovering a node shows its ports; drag from a port onto a node or port links (a smart line, or the last link type
 *    picked).
 * 3. O / L / K / P pick the smart line, line, curve or spline link tool: every port shows; dropping onto empty canvas creates a
 *    rectangle and links to it. A selected spline shows a diamond per control point and a dot per span midpoint:
 *    drag a diamond to move a point, drag a dot to add one there, alt-click a diamond to remove one.
 * 4. R / E / T / F then drag draws a rectangle, ellipse, text or frame (the UML class is plugin-uml's);
 *    Delete removes the selection (nodes or links).
 * 5. Double-click a frame (or zoom until it fills the view) drills in; Escape, Up or the breadcrumb drills out.
 * 6. G (or the Grid button) toggles the grid; with it off nothing snaps. The floating inspector (top right) edits the
 *    selected element.
 */
type StoryArgs = {
  depth: number;
  liveDepth: number;
  readonly?: boolean;
  fixture?: 'elements' | 'model' | 'square' | 'lattice' | 'scenes' | 'frame' | 'nested';
  inspectors?: InspectorMode;
};

type EditorProps = {
  store: ReturnType<typeof createMemoryStore>;
  root: string;
  liveDepth: number;
  readonly?: boolean;
  lattice?: boolean;
  inspectors?: InspectorMode;
};

const Editor = ({
  store,
  root,
  liveDepth,
  readonly: initialReadonly = false,
  lattice,
  inspectors: initialInspectors = 'floating',
}: EditorProps) => {
  // The args are where the view starts; the palette's toggle and the inspectors' menus change it from there.
  const [readonly, setReadonly] = useState(initialReadonly);
  const [inspectors, setInspectors] = useState(initialInspectors);
  const [theme, setTheme] = useState<string>();
  const [backgroundGrid, setBackgroundGrid] = useState<BackgroundGrid>();
  return (
    <Canvas.Root
      store={store}
      root={root}
      readonly={readonly}
      onReadonlyChange={setReadonly}
      inspectors={inspectors}
      onInspectorsChange={setInspectors}
      theme={theme}
      onThemeChange={setTheme}
      backgroundGrid={backgroundGrid}
      onBackgroundGridChange={setBackgroundGrid}
      createProjection={lattice ? createLatticeProjection : undefined}
    >
      <Canvas.Viewport liveDepth={liveDepth} />
      <Canvas.Navigation />
      <Canvas.Actions />
      <Canvas.Debug />
      <Canvas.Theme />
      <Canvas.Tools />
      <Canvas.Properties />
      <Canvas.Layers />
      <Canvas.About />
    </Canvas.Root>
  );
};

const DefaultStory = ({ depth, liveDepth, readonly, fixture, inspectors }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    // The model fixture is a fixed three levels, so `depth` does not apply to it.
    const tree =
      fixture === 'model'
        ? createModelSceneTree()
        : fixture === 'square'
          ? createSquareTree()
          : fixture === 'lattice'
            ? createLatticeTree()
            : fixture === 'scenes'
              ? createNestedDeepTree()
              : fixture === 'frame'
                ? createFrameTree()
                : fixture === 'nested'
                  ? createNestedSimpleTree()
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
      inspectors={inspectors}
    />
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/Canvas',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  // The properties panel is a react-ui-form form; its strings (e.g. "Mixed") and its controls' come from their bundles.
  parameters: { translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    inspectors: {
      control: { type: 'inline-radio' },
      options: ['docked', 'floating'],
      description: 'Where the inspectors (properties, layers, about) sit',
    },
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

/** The same scene to look at: select, pan, zoom and drill, but no handle, port, tool or key changes it. */
export const Readonly: Story = {
  args: { depth: 1, liveDepth: 1, readonly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Read-only, the palette offers only select and pan, and there is no action bar.
    const toggle = await canvas.findByTestId('palette-readonly');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.queryByTestId('canvas-actions')).toBeNull();

    // 2. The toggle turns editing on: the action bar appears.
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(await canvas.findByTestId('canvas-actions')).toBeVisible();

    // 3. And back to read-only.
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByTestId('canvas-actions')).toBeNull());
  },
};

/** A view nested in the root: drill into C and back out; `liveDepth` sets how many levels render live. */
export const NestedSimple: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'nested' },
};

/**
 * Lattice mode (DESIGN §8b): shapes snap to whole cells of a 256x128 lattice with 128x64 gutters, span any number
 * of cells, and may not overlap; a drag onto occupied cells previews in red and is refused.
 */
/** A, an empty scene B and C in a column: open B, draw in it, and compare sizes at 100% on both levels. */
export const NestedDeep: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'scenes' },
};

/** A three-level model, a box per class: drill into a subsystem's portal to open its own. */
export const Model: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'model' },
};

export const Lattice: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'lattice' },
};

/**
 * Docked inspectors: one accordion section each beside the canvas, only the properties open to start; a header opens
 * or closes its section, and the dock's close button floats the same column over the canvas.
 */
export const Docked: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'square', inspectors: 'docked' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. With nothing selected the dock holds no properties; the layers section starts closed, and its header opens it.
    const dock = await canvas.findByTestId('scene-view-dock');
    await waitFor(() =>
      expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'closed'),
    );
    await expect(within(dock).queryByTestId('dock-section-properties')).not.toBeInTheDocument();
    await userEvent.click(
      within(within(dock).getByTestId('dock-section-layers')).getByRole('button', { name: 'Layers' }),
    );
    await waitFor(() => expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'open'));
    // 2. Closing the dock floats the inspectors in the same column: the layers over the canvas while nothing is selected.
    await userEvent.click(within(dock).getByTestId('dock-close'));
    await waitFor(() => expect(canvas.getByTestId('scene-view-dock')).toHaveAttribute('data-floating'));
    await expect(within(canvas.getByTestId('scene-view-dock')).getByTestId('layers')).toBeVisible();
  },
};

/** Floating inspectors (the default): the panel over the canvas, the layers until something is selected; its toolbar docks them. */
export const Floating: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'square', inspectors: 'floating' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('layers')).toBeInTheDocument();
    await expect(canvas.getByTestId('scene-view-dock')).toHaveAttribute('data-floating');
    // About shows only while docked.
    await expect(canvas.queryByTestId('about')).not.toBeInTheDocument();
    // The inspector panel's own toolbar docks the inspectors.
    await userEvent.click(canvas.getByTestId('dock-open'));
    await waitFor(() => expect(canvas.getByTestId('scene-view-dock')).not.toHaveAttribute('data-floating'));
    // Docked, the about section joins the column, closed until opened (only the properties start open).
    await expect(await canvas.findByTestId('dock-section-about')).toHaveAttribute('data-state', 'closed');
  },
};

/** A frame onto a nested scene: its open control drills into the child scene, and Up returns. */
export const Frame: Story = {
  args: { depth: 0, liveDepth: 1, fixture: 'frame' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The frame shows its label and an open control; the root has nowhere up to go.
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="frame"]')).toHaveTextContent('Frame'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeDisabled());
    // 2. Opening the frame drills into its scene, once the camera has animated into it, which a loaded run slows.
    await userEvent.click(await canvas.findByTestId('portal-open'));
    await waitFor(() => expect(canvas.getByTestId('toolbar-up')).toBeEnabled(), { timeout: 5_000 });
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="b"]')).not.toBeNull());
  },
};
