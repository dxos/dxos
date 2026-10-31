//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import {
  CONSTRAINED_2D,
  DOCUMENT_2D,
  DOCUMENT_3D,
  DYNAMIC_2D,
  FullEditor,
  LATTICE_2D,
  SceneEditorStory,
} from '../testing/index.ts';

type StoryProps = {
  dim: Scene.Dimension;
  /** Only an article edits; a card draws the picture. */
  role?: 'article' | 'card';
  docked?: boolean;
  /** A 2D layout in a mode of its own. */
  mode?: 'lattice' | 'dynamic' | 'constrained';
};

const MODE_DOCUMENTS = { lattice: LATTICE_2D, dynamic: DYNAMIC_2D, constrained: CONSTRAINED_2D };

const documentOf = (dim: Scene.Dimension, mode: StoryProps['mode']) =>
  dim === '3d' ? DOCUMENT_3D : mode ? MODE_DOCUMENTS[mode] : DOCUMENT_2D;

const DefaultStory = ({ dim, role = 'article', docked = true, mode }: StoryProps) => (
  <SceneEditorStory document={documentOf(dim, mode)} role={role} docked={docked}>
    <FullEditor dim={dim} />
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-canvas-editor/editor/SceneEditor',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    dim: { control: 'inline-radio', options: ['2d', '3d'] },
    role: { control: 'inline-radio', options: ['article', 'card'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { dim: '2d' } };

export const Editor2D: Story = { args: { dim: '2d' } };

export const Editor3D: Story = { args: { dim: '3d' } };

export const Card2D: Story = { args: { dim: '2d', role: 'card' } };

export const Card3D: Story = { args: { dim: '3d', role: 'card' } };

/**
 * Test:
 * 1. Drag A part of a cell: it lands on whole cells when released; the guides show the cells.
 * 2. Drag A onto B: the move is refused and A is drawn back where it was.
 * 3. Turn snapping off in the display panel: shapes move freely; back on, the next move snaps.
 */
export const Lattice2D: Story = { args: { dim: '2d', mode: 'lattice' } };

/**
 * Test:
 * 1. Drag Leaf anywhere: it stays where it is dropped (pinned).
 * 2. Delete Right: the unpinned shapes are re-placed in rows along the links; Leaf stays put.
 */
export const Dynamic2D: Story = { args: { dim: '2d', mode: 'dynamic' } };

/**
 * Test:
 * 1. Drag C to the right of D: it is re-related to D (east, aligned) and every shape is re-placed on the grid.
 * 2. Undo: C and the constraints go back together; redo moves both again.
 * 3. Delete A: its constraints go with it and the rest are re-placed.
 */
export const Constrained2D: Story = { args: { dim: '2d', mode: 'constrained' } };
