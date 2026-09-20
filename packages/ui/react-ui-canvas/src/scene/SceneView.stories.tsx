//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { type ReactNode, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSceneViewAtoms } from './atoms.ts';
import { useSceneProjection } from './hooks.ts';
import { Properties } from './Properties.tsx';
import { SceneView } from './SceneView.tsx';
import { createMemoryStore } from './store.ts';
import { createSceneTree } from './testing.ts';

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
type StoryArgs = { depth: number };

const RegistryWrapper = ({ children }: { children: ReactNode }) => {
  const [registry] = useState(() => Registry.make());
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const withRegistry: Decorator = (Story) => (
  <RegistryWrapper>
    <Story />
  </RegistryWrapper>
);

const Editor = ({ store, root }: { store: ReturnType<typeof createMemoryStore>; root: string }) => {
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  const projection = useSceneProjection({ store, atoms });
  return (
    <div className='dx-fill grid grid-cols-[1fr_20rem]'>
      <SceneView store={store} root={root} atoms={atoms} />
      <Properties projection={projection} atoms={atoms} classNames='border-l border-separator' />
    </div>
  );
};

const DefaultStory = ({ depth }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = createSceneTree(depth);
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, [depth]);
  // Keyed on the root so a new tree remounts the editor, whose atoms are created on mount.
  return <Editor key={root} store={store} root={root} />;
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/SceneView',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    depth: { control: { type: 'range', min: 1, max: 5, step: 1 } },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** One scene, no portals: selection, move, resize, linking and the palette. */
export const Freehand: Story = {
  args: { depth: 1 },
};

/** Four levels of portals: drill in and out, tiers, auto drill. */
export const Nested: Story = {
  args: { depth: 4 },
};
