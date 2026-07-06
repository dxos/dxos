//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { HomeSection } from './HomeSection';

const DefaultStory = () => (
  <HomeSection.Root>
    <HomeSection.Header title='Recent' onClose={() => {}} />
    <div className='rounded-sm bg-group-surface p-4 text-description'>Section content.</div>
  </HomeSection.Root>
);

const WithActionsStory = () => (
  <HomeSection.Root>
    <HomeSection.Header title='Activity' onClose={() => {}}>
      <Button variant='ghost'>All</Button>
      <Button variant='ghost'>30d</Button>
    </HomeSection.Header>
    <div className='rounded-sm bg-group-surface p-4 text-description'>Section content.</div>
  </HomeSection.Root>
);

const meta = {
  title: 'sdk/app-framework/HomeSection',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: 'p-4' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = { render: WithActionsStory };
