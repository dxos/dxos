//
// Copyright 2023 DXOS.org
//

import './mailbox.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { IntentPlugin, SettingsPlugin, Surface, useCapability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Filter, fullyQualifiedId, useQuery, useSpace } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { InboxCapabilities } from '../../capabilities';
import { InboxPlugin } from '../../InboxPlugin';
import { TAGS_MAP, createMessages } from '../../testing';
import { initializeMailbox } from '../../testing';
import { Mailbox } from '../../types';

import { Mailbox as MailboxComponent } from './Mailbox';

// TODO(burdon): Tag filter should be by ID.

const DefaultStory = () => {
  const [messages] = useState(() => createMessages(100));
  return <MailboxComponent role='story' id='story' messages={messages} ignoreAttention tags={TAGS_MAP} />;
};

const WithCompanionStory = () => {
  const space = useSpace();
  const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));

  const state = useCapability(InboxCapabilities.MailboxState);
  const message = mailbox && state[fullyQualifiedId(mailbox)];

  const mailboxData = useMemo(() => ({ subject: mailbox }), [mailbox]);
  const companionData = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(mailbox ? fullyQualifiedId(mailbox) : undefined);

  if (!space || !mailbox) {
    return null;
  }

  return (
    <div {...attentionAttrs} className='bs-full is-full grid grid-cols-2 grid-rows-2 overflow-hidden'>
      <Surface role='article' data={mailboxData} />
      <Surface role='article' data={companionData} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/Mailbox',
  component: MailboxComponent as any,
  render: DefaultStory,
  decorators: [withTheme, withAttention],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCompanion: Story = {
  render: render(WithCompanionStory),
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [Mailbox.Mailbox, DataType.Message, DataType.Person],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            // TODO(wittjosiah): Share message builder with transcription stories. Factor out to @dxos/schema/testing.
            await initializeMailbox(client.spaces.default);
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        PreviewPlugin(),
        InboxPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
};
