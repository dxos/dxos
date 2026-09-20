//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { type ReactNode, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SceneView } from './SceneView.tsx';
import { createMemoryStore } from './store.ts';
import { createSceneTree } from './testing.ts';

/**
 * Test:
 * 1. Ctrl/cmd+wheel zooms about the cursor; wheel or hand-tool drag pans; drag on empty canvas draws a marquee.
 * 2. Click selects, shift-click toggles; drag moves the selection (snapped); handles resize a single cell.
 * 3. L (link tool) shows ports; drag from a port onto a cell or port links; onto empty canvas creates a rect and links.
 * 4. R / T / S then drag draws a rect, text or nested scene; Delete removes the selection.
 * 5. Double-click a portal (or zoom until it fills the view) drills in; Escape, Up or the breadcrumb drills out.
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

const DefaultStory = ({ depth }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = createSceneTree(depth);
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, [depth]);
  // Keyed on the root so a new tree remounts the view, whose atoms are created on mount.
  return <SceneView key={root} store={store} root={root} />;
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
