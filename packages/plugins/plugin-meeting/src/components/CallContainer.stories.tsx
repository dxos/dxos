//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useClient } from '@dxos/react-client';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CallContainer, type CallContainerProps } from './CallContainer';
import { createMeetingPlugins } from '../testing';
import translations from '../translations';

const DefaultStory = (props: CallContainerProps) => {
  const client = useClient();
  const space = client.spaces.get().at(-1);

  if (!space) {
    return <div />;
  }

  return (
    <div className='flex grow gap-8 justify-center'>
      <div className='flex w-[30rem] h-full border border-neutral-500'>
        <CallContainer {...props} />
      </div>
    </div>
  );
};

const meta: Meta<CallContainerProps> = {
  title: 'plugins/plugin-meeting/CallContainer',
  component: CallContainer,
  render: DefaultStory,
  decorators: [
    withPluginManager({ plugins: [...(await createMeetingPlugins())] }),
    withLayout({ fullscreen: true, tooltips: true }),
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
