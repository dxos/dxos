//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FileTree, type FileEntry } from './FileTree';

const FILES: FileEntry[] = [
  { path: 'package.json' },
  { path: 'README.md' },
  { path: 'src/plugin.ts' },
  { path: 'src/components/Panel.tsx' },
  { path: 'src/components/UnreadList.tsx' },
  { path: 'src/operations/list-threads.ts' },
];

const DefaultStory = () => {
  const [selected, setSelected] = useState<string | undefined>('src/plugin.ts');
  return (
    <div className='w-64 border border-separator h-96 overflow-auto'>
      <FileTree files={FILES} selectedPath={selected} onSelect={setSelected} />
    </div>
  );
};

const EmptyStory = () => (
  <div className='w-64 border border-separator h-96 overflow-auto'>
    <FileTree files={[]} />
  </div>
);

const meta = {
  title: 'plugins/plugin-code/components/FileTree',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const Empty: Story = {
  render: () => <EmptyStory />,
};
