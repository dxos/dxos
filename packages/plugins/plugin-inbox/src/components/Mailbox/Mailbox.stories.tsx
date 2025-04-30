//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import './mailbox.css';

import { type Meta } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { IntentPlugin, Surface, SettingsPlugin, useCapability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ObjectId, create } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { refFromDXN } from '@dxos/live-object';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { Filter, fullyQualifiedId, live, type Space, useQuery, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { MessageType } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';

import { Mailbox } from './Mailbox';
import { InboxPlugin } from '../../InboxPlugin';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { createMessages } from '../../testing';
import { MailboxType } from '../../types';

const createMessage = () => {
  return create(MessageType, {
    created: faker.date.recent().toISOString(),
    sender: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
    },
    blocks: [{ type: 'text', text: faker.lorem.paragraphs(5) }],
  });
};

const initializeMailbox = async (space: Space) => {
  const queueDxn = new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]);
  const queue = space.queues.get<MessageType>(queueDxn);
  queue.append([...new Array(30)].map(createMessage));
  const mailbox = live(MailboxType, { queue: refFromDXN(queueDxn) });
  space.db.add(mailbox);
  return mailbox;
};

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
    <div className='grow grid grid-cols-2 overflow-hidden divide-x divide-divider'>
      <Surface role='article' data={mailboxData} />
      <Surface role='article' data={companionData} />
    </div>
  );
};

export const WithCompanion = {
  render: WithCompanionStory,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [MailboxType, MessageType],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            await initializeMailbox(client.spaces.default);
          },
        }),
        InboxPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        SpacePlugin(),
        ThemePlugin({ tx: defaultTx }),
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
