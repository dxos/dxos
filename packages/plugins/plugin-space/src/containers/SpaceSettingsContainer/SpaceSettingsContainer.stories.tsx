//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { SpaceSettingsContainer, type SpaceSettingsContainerProps } from './SpaceSettingsContainer';

const Story = (props: Partial<SpaceSettingsContainerProps>) => {
  const { space } = useClientStory();
  if (!space) {
    return <Loading />;
  }

  return <SpaceSettingsContainer {...props} space={space} />;
};

const meta = {
  title: 'plugins/plugin-space/containers/SpaceSettingsContainer',
  component: SpaceSettingsContainer,
  render: Story,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [OperationPlugin(), RuntimePlugin()] }),
  ],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SpaceSettingsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<typeof SpaceSettingsContainer> = {};
