//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { HistoryScrubber, type HistoryScrubberProps, type ScrubberVersion } from './HistoryScrubber';

// Deterministic fixture: ~30 versions with varied additions/deletions over time.
// NOTE: pure fixture data — this story imports nothing from echo / automerge / client.
const makeVersions = (count: number): ScrubberVersion[] => {
  const base = new Date('2024-01-01T09:00:00Z').getTime();
  const authors = ['alice', 'bob', 'carol'];
  const versions: ScrubberVersion[] = [];
  let cursor = base;
  for (let index = 0; index < count; index++) {
    // Pseudo-random but deterministic magnitudes driven by the index.
    const added = index === 0 ? 120 : Math.round((Math.sin(index) * 0.5 + 0.5) * 40);
    const removed = index === 0 ? 0 : Math.round((Math.cos(index * 1.7) * 0.5 + 0.5) * 25);
    cursor += (index % 5 === 0 ? 3 : 1) * 37 * 60 * 1000;
    versions.push({ time: cursor, author: authors[index % authors.length], added, removed });
  }
  return versions;
};

const DefaultStory = (props: Partial<HistoryScrubberProps>) => {
  const versions = props.versions ?? makeVersions(30);
  const [index, setIndex] = useState(versions.length - 1);
  return (
    <div className='flex w-[40rem] flex-col gap-4'>
      <HistoryScrubber {...props} versions={versions} value={index} onValueChange={setIndex} />
      <div className='text-sm text-description'>
        Selected version {index + 1} / {versions.length}
      </div>
    </div>
  );
};

const meta: Meta<typeof HistoryScrubber> = {
  title: 'ui/react-ui-components/HistoryScrubber',
  component: HistoryScrubber,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
};

export default meta;

type Story = StoryObj<typeof HistoryScrubber>;

export const Default: Story = {};

export const Sparse: Story = {
  render: () => <DefaultStory versions={makeVersions(5)} />,
};

export const Uncontrolled: Story = {
  render: () => (
    <div className='w-[40rem]'>
      <HistoryScrubber versions={makeVersions(18)} onCommit={(index) => console.log('commit', index)} />
    </div>
  ),
};
