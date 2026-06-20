//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordComponent } from './DiscordComponent';

const DefaultStory = () => (
  <DiscordComponent.Root>
    <div className='grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden h-full is-full'>
      <DiscordComponent.Header />
      <DiscordComponent.Channels />
      <DiscordComponent.Content />
      <DiscordComponent.StatusBar />
    </div>
  </DiscordComponent.Root>
);

const meta = {
  title: 'plugins/plugin-support/containers/DiscordComponent',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-r1-size)' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
