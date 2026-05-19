//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordWidget } from './DiscordWidget';

const DefaultStory = () => (
  <DiscordWidget.Root>
    <div className='grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bs-full is-full'>
      <DiscordWidget.Header />
      <DiscordWidget.Channels />
      <DiscordWidget.Content />
      <DiscordWidget.StatusBar />
    </div>
  </DiscordWidget.Root>
);

const meta = {
  title: 'plugins/plugin-support/containers/DiscordWidget',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
