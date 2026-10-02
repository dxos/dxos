//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { HomeSection } from './HomeSection.tsx';

const DefaultStory = () => (
  <HomeSection.Root>
    <HomeSection.Header title='Recent' onClose={() => {}} />
    <div className='rounded-sm bg-group-surface p-4 text-description'>Section content.</div>
  </HomeSection.Root>
);

const WithActionsStory = () => (
  <HomeSection.Root>
    <HomeSection.Header title='Activity' onClose={() => {}}>
      <Button.Root variant='ghost'>All</Button.Root>
      <Button.Root variant='ghost'>30d</Button.Root>
    </HomeSection.Header>
    <div className='rounded-sm bg-group-surface p-4 text-description'>Section content.</div>
  </HomeSection.Root>
);

const meta = {
  title: 'sdk/app-framework/components/HomeSection',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: 'p-4' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = { render: WithActionsStory };
