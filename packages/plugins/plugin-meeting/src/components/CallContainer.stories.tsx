//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme, withLayout, ColumnContainer } from '@dxos/storybook-utils';

import { CallContainer, type CallContainerProps } from './CallContainer';
import { createMeetingPlugins } from '../testing';
import translations from '../translations';

const meta: Meta<CallContainerProps> = {
  title: 'plugins/plugin-meeting/CallContainer',
  component: CallContainer,
  decorators: [
    withPluginManager({ plugins: [...(await createMeetingPlugins())] }),
    withLayout({ tooltips: true, Container: ColumnContainer, classNames: 'w-[40rem] overflow-hidden' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<CallContainerProps>;

export const Default: Story = {
  args: {
    // Fixed room for testing.
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};
