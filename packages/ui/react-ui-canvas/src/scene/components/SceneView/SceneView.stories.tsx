//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { type ReactNode, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useSceneProjection } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { createMemoryStore } from '../../model/store.ts';
import { createSceneTree } from '../../utils/testing.ts';
import { Properties } from '../Properties/Properties.tsx';
import { SceneView } from './SceneView.tsx';

/**
 * Test:
 * 1. Ctrl/cmd+wheel zooms about the cursor; wheel or hand-tool drag pans; drag on empty canvas draws a marquee.
 * 2. Click selects, shift-click toggles; drag moves the selection (snapped); handles resize a single node.
 *    Hovering a node shows its ports; drag from a port onto a node or port links (with the last link type picked).
 * 3. L / K / P pick the line, curve or spline link tool: every port shows; dropping onto empty canvas creates a
 *    rectangle and links to it. A selected spline shows its control points: drag one, double-click the spline to add
 *    one, alt-click one to remove it.
 * 4. R / E / C / T / S then drag draws a rectangle, ellipse, UML class, text or nested scene; Delete removes the
 *    selection (nodes or links).
 * 5. Double-click a portal (or zoom until it fills the view) drills in; Escape, Up or the breadcrumb drills out.
 * 6. G (or the Grid button) toggles the grid; with it off nothing snaps. The right panel edits the selected element.
 */
type StoryArgs = { depth: number; liveDepth: number };

const RegistryWrapper = ({ children }: { children: ReactNode }) => {
  const [registry] = useState(() => Registry.make());
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const withRegistry: Decorator = (Story) => (
  <RegistryWrapper>
    <Story />
  </RegistryWrapper>
);

type EditorProps = { store: ReturnType<typeof createMemoryStore>; root: string; liveDepth: number };

const Editor = ({ store, root, liveDepth }: EditorProps) => {
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  const projection = useSceneProjection({ store, atoms });
  return (
    <div className='dx-fill grid grid-cols-[1fr_20rem]'>
      <SceneView store={store} root={root} atoms={atoms} liveDepth={liveDepth} />
      <Properties projection={projection} atoms={atoms} classNames='border-l border-separator' />
    </div>
  );
};

const DefaultStory = ({ depth, liveDepth }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = createSceneTree(depth);
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, [depth]);
  // Keyed on the root so a new tree remounts the editor, whose atoms are created on mount.
  return <Editor key={root} store={store} root={root} liveDepth={liveDepth} />;
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/SceneView',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    depth: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'Levels of nested scenes in the fixture',
    },
    liveDepth: {
      control: { type: 'range', min: 0, max: 4, step: 1 },
      description: 'Nested levels rendered live below the root; deeper portals are previews',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** One scene, no portals: selection, move, resize, linking and the palette. */
export const Freehand: Story = {
  args: { depth: 1, liveDepth: 1 },
};

/** Four levels of portals: drill in and out, tiers, auto drill; `liveDepth` sets how many levels render live. */
export const Nested: Story = {
  args: { depth: 4, liveDepth: 1 },
};
