//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Scene } from '@dxos/scene';

import { LibraryPanel } from './LibraryPanel.tsx';

const OBJECTS: Scene.Object3D[] = [
  { id: 'team', kind: 'sphere', parts: 'cluster' },
  { id: 'hub', kind: 'sphere' },
  { id: 'spoke', kind: 'sphere' },
];

/**
 * The canvas model's objects.
 * 1. Place puts the place tool on that object (highlighted while it is the one being placed).
 * 2. A composite (team) has Edit parts, which opens its parts layout.
 */
const DefaultStory = () => {
  const [placing, setPlacing] = useState<string>();
  const [editing, setEditing] = useState<string>();
  return (
    <div className='w-72 flex flex-col gap-2'>
      <LibraryPanel objects={OBJECTS} placing={placing} onPlace={setPlacing} onEditParts={setEditing} />
      <p className='text-sm text-description' data-testid='library-state'>
        placing: {placing ?? '—'}; editing: {editing ?? '—'}
      </p>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-canvas/containers/LibraryPanel',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
