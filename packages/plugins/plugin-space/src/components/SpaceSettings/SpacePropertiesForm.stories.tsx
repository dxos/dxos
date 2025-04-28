//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { SpacePropertiesForm, type SpacePropertiesFormProps } from './SpacePropertiesForm';
import translations from '../../translations';

const Story = (args: Partial<SpacePropertiesFormProps>) => {
  const { space } = useClientProvider();
  return (
    <div role='none' className='p-2 border border-primary-500 rounded'>
      <SpacePropertiesForm {...args} space={space!} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-space/SpacePropertiesForm',
  component: SpacePropertiesForm,
  render: Story,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme],
  parameters: {
    translations,
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<typeof SpacePropertiesForm> = {};
