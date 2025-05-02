//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import './mailbox.css';

import { type Meta } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { IntentPlugin, Surface, SettingsPlugin, useCapability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Filter, fullyQualifiedId, useQuery, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { Contact, MessageType } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';

import { Mailbox } from './Mailbox';
import { initializeMailbox } from './testing';
import { InboxPlugin } from '../../InboxPlugin';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { createMessages } from '../../testing';
import { MailboxType } from '../../types';

const DefaultStory = () => {
  const [messages] = useState(() => createMessages(100));
  return <Mailbox id='story' messages={messages} ignoreAttention />;
};

export const Default = {};

const WithCompanionStory = () => {
  const space = useSpace();
  const [mailbox] = useQuery(space, Filter.schema(MailboxType));
  const state = useCapability(InboxCapabilities.MailboxState);

  const mailboxData = useMemo(() => ({ subject: mailbox }), [mailbox]);
  const message = mailbox && state[fullyQualifiedId(mailbox)];
  const companionData = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  if (!space || !mailbox) {
    return <div>Loading...</div>;
  }

  return (
    <div className='is-full grid grid-cols-[1fr_1fr] overflow-hidden divide-separator'>
      <div role='none' className='relative border-ie border-separator'>
        <Surface role='article' data={mailboxData} />
      </div>
      <Surface role='article' data={companionData} />
    </div>
  );
};

export const WithCompanion = {
  render: WithCompanionStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        ClientPlugin({
          types: [MailboxType, MessageType, Contact],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            await initializeMailbox(client.spaces.default);
          },
        }),
        PreviewPlugin(),
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        InboxPlugin(),
      ],
    }),
  ],
};

const meta: Meta = {
  title: 'plugins/plugin-inbox/Mailbox',
  component: Mailbox,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true })],
};

export default meta;
