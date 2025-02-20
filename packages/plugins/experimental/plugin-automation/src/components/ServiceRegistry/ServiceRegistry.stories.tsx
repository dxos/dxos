//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ServiceRegistry } from './ServiceRegistry';

const meta: Meta<typeof ServiceRegistry> = {
  title: 'plugins/plugin-automation/ServiceRegistry',
  component: ServiceRegistry,
  render: ({ space: _ignore, ...args }) => {
    const space = useSpace();
    if (!space) {
      return <div />;
    }

    return (
      <div className='h-full w-[300px] overflow-hidden'>
        <ServiceRegistry space={space} {...args} />
      </div>
    );
  },
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      // types: [ServiceType], // TODO(burdon): Doesn't fit type constraint???
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
