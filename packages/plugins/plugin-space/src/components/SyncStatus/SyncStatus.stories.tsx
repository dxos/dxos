//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SyncStatusIndicator } from './SyncStatus';
import translations from '../../translations';

const DefaultStory = (props: any) => {
  return (
    <div className='flex flex-col-reverse p-4'>
      <SyncStatusIndicator {...props} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-space/SyncStatusIndicator',
  component: SyncStatusIndicator,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations },
};

export default meta;

type Story = StoryObj<typeof SyncStatusIndicator>;

export const Default: Story = {
  args: {
    state: {},
    saved: true,
  },
};

export const Saving: Story = {
  args: {
    state: {},
    saved: false,
  },
};
