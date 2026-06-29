//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type ResponsiveGridItemProps, ResponsiveGridItem } from './ResponsiveGridItem';

type TestItem = { id: string; name: string };

const item: TestItem = { id: 'alice', name: 'Alice' };

const DefaultStory = (props: ResponsiveGridItemProps<TestItem>) => (
  <div className='grid grow place-items-center p-4'>
    <div className='aspect-video w-96'>
      <ResponsiveGridItem<TestItem> {...props} />
    </div>
  </div>
);

const meta: Meta<ResponsiveGridItemProps<TestItem>> = {
  title: 'plugins/plugin-calls/components/ResponsiveGridItem',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<ResponsiveGridItemProps<TestItem>>;

export const Default: Story = {
  args: { item, name: item.name },
};

export const Speaking: Story = {
  args: { item, name: item.name, speaking: true },
};

export const Muted: Story = {
  args: { item, name: item.name, mute: true },
};

export const RaisedHand: Story = {
  args: { item, name: item.name, wave: true },
};

export const Pinned: Story = {
  args: { item, name: item.name, pinned: true },
};
