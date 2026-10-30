//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { DOCUMENT_2D, DOCUMENT_3D, FullEditor, SceneEditorStory } from '../testing/index.ts';

type StoryProps = {
  dim: Scene.Dimension;
  /** Only an article edits; a card draws the picture. */
  role?: 'article' | 'card';
  docked?: boolean;
};

const DefaultStory = ({ dim, role = 'article', docked = true }: StoryProps) => (
  <SceneEditorStory document={dim === '3d' ? DOCUMENT_3D : DOCUMENT_2D} role={role} docked={docked}>
    <FullEditor dim={dim} />
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-scene/editor/SceneEditor',
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
