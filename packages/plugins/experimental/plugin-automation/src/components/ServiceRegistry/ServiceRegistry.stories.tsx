//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ServiceRegistry } from './ServiceRegistry';

const meta: Meta<typeof ServiceRegistry> = {
  title: 'plugins/plugin-automation/ServiceRegistry',
  component: ServiceRegistry,
  render: (args) => (
    <div className='w-[400px]'>
      <ServiceRegistry {...args} />
    </div>
  ),
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [],
    }),
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center' }),
    withTheme,
  ],
};

export default meta;

type Story = StoryObj<typeof ServiceRegistry>;

export const Default: Story = {
  args: {},
};
