//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type DiscordBinding } from '#types';

import { DiscordBindingForm } from './DiscordBindingForm.tsx';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [values, setValues] = useState<Partial<DiscordBinding.Properties>>({
    applicationId: '1234567890',
    channels: ['1122334455'],
  });

  return (
    <DiscordBindingForm
      db={space?.db}
      label='Discord'
      description='Connect the agent to a Discord bot.'
      values={values}
      onSave={setValues}
    />
  );
};

const meta = {
  title: 'plugins/plugin-interlocutor/components/DiscordBindingForm',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [AccessToken.AccessToken],
      onCreateSpace: async ({ space }) => {
        space.db.add(
          Obj.make(AccessToken.AccessToken, { source: 'discord.com', account: 'interlocutor-bot', token: 'test' }),
        );
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
