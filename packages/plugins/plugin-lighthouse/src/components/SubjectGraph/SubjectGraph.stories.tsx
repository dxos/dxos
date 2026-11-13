//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { graphFixture } from '../../testing/graph-fixture.ts';
import { SubjectGraph } from './SubjectGraph.tsx';

/** Selection is the host's; the story keeps it in state so clicking a card outlines it. */
const DefaultStory = () => {
  const [selected, setSelected] = useState<string | undefined>(graphFixture.roots[0]);
  return (
    <div className='dx-fill'>
      <SubjectGraph graph={graphFixture} selectedId={selected} onSelect={setSelected} onMore={() => {}} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/SubjectGraph',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A real neighbourhood (36 nodes): a person, their roles, organisations and repositories. */
export const Default: Story = {};
