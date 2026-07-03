//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Sidepanel } from './Sidepanel';

// Sidepanel wraps its own Root (theme + tooltip + error boundary). The WebExtension/agents APIs
// are stubbed in Storybook, so the toolbar, empty chat, and statusbar render at panel dimensions.
const meta = {
  title: 'apps/composer-crx/Sidepanel',
  component: Sidepanel,
  render: () => (
    <div className='relative w-[24rem] h-[40rem] border border-separator'>
      <Sidepanel />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof Sidepanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
