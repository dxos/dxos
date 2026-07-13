//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { GithubComponent } from './GithubComponent';

const DefaultStory = () => (
  <GithubComponent.Root>
    <div className='grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden h-full is-full'>
      <GithubComponent.Header />
      <GithubComponent.Content />
      <GithubComponent.StatusBar />
    </div>
  </GithubComponent.Root>
);

const meta = {
  title: 'plugins/plugin-devtools/containers/GithubComponent',
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
