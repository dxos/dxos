//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { useStoryClientData, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { SpaceSettingsPanel, type SpaceSettingsPanelProps } from './SpaceSettingsPanel';
import translations from '../../translations';

const Story = (args: Partial<SpaceSettingsPanelProps>) => {
  const { space } = useStoryClientData();

  return <SpaceSettingsPanel {...args} space={space!} />;
};

const meta: Meta = {
  title: 'plugins/plugin-space/SpaceSettingsPanel',
  component: SpaceSettingsPanel,
  render: Story,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme],
  parameters: { translations },
};

export default meta;

export const Default: StoryObj<typeof SpaceSettingsPanel> = {};
