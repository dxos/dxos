//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { SpaceSettingsContainer, type SpaceSettingsContainerProps } from './SpaceSettingsContainer';

const Story = (args: Partial<SpaceSettingsContainerProps>) => {
  const { space } = useClientProvider();
  return (
    <div role='none' className='p-2 border border-primary-500 rounded'>
      <SpaceSettingsContainer {...args} space={space!} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-space/SpaceSettingsContainer',
  component: SpaceSettingsContainer,
  render: Story,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme],
  parameters: {
    translations,
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<typeof SpaceSettingsContainer> = {};
