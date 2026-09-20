//
// Copyright 2026 DXOS.org
//

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SceneView } from './SceneView.tsx';
import { createSceneTree } from './testing.ts';

type StoryArgs = { depth: number };

/**
 * THROWAWAY SPIKE for the multi-depth canvas design.
 *
 * Test:
 * 1. Ctrl/cmd+wheel zooms about the cursor; wheel or background-drag pans.
 * 2. Portals show a tile, then a title, then the live child scene as they grow on screen.
 * 3. Double-click a portal (or zoom until it fills the view) to drill in; Escape, "Up", or zooming out drills out.
 * 4. Drag a rect to move it; shift-click to multi-select and move together.
 */
const DefaultStory = ({ depth }: StoryArgs) => {
  const { store, root } = useMemo(() => createSceneTree(depth), [depth]);
  // Keyed on the root so a new tree remounts the view, whose store and path state are set on mount.
  return <SceneView key={root} store={store} root={root} />;
};

const meta = {
  title: 'ui/react-ui-canvas/experimental/SceneView',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { depth: 4 },
};
