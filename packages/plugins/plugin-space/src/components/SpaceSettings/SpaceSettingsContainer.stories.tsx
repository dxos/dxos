//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { SpaceSettingsContainer, type SpaceSettingsContainerProps } from './SpaceSettingsContainer';

const Story = (props: Partial<SpaceSettingsContainerProps>) => {
  const { space } = useClientProvider();
  return (
    <div role='none' className='p-2 border border-primary-500 rounded'>
      <SpaceSettingsContainer {...props} space={space!} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-space/SpaceSettingsContainer',
  component: SpaceSettingsContainer,
  render: Story,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [IntentPlugin()] }),
    withTheme,
  ],
  parameters: {
    translations,
    layout: 'centered',
  },
} satisfies Meta<typeof SpaceSettingsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<typeof SpaceSettingsContainer> = {};
