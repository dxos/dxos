//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import './mailbox.css';

import { type Meta } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { IntentPlugin, Surface, SettingsPlugin, useCapability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Filter, fullyQualifiedId, useQuery, useSpace } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
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

const WithCompanionStory = () => {
  const space = useSpace();
  const [mailbox] = useQuery(space, Filter.type(MailboxType));
  const state = useCapability(InboxCapabilities.MailboxState);

  const message = mailbox && state[fullyQualifiedId(mailbox)];
  const mailboxData = useMemo(() => ({ subject: mailbox }), [mailbox]);
  const companionData = useMemo(() => ({ subject: message ?? 'message', companionTo: mailbox }), [message, mailbox]);

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(mailbox ? fullyQualifiedId(mailbox) : undefined);

  if (!space || !mailbox) {
    return <div>Loading...</div>;
  }

  return (
    <div {...attentionAttrs} className='is-full grid grid-cols-[1fr_1px_1fr] overflow-hidden divide-separator'>
      <Surface role='article' data={mailboxData} />
      <span role='separator' className='bg-separator' />
      <Surface role='article' data={companionData} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-inbox/Mailbox',
  component: Mailbox,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withAttention],
};

export default meta;

export const Default = {};

export const WithCompanion = {
  render: WithCompanionStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [MailboxType, DataType.Message, DataType.Person],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            // TODO(wittjosiah): Share message builder with transcription stories. Factor out to @dxos/schema/testing.
            await initializeMailbox(client.spaces.default);
          },
        }),
        StorybookLayoutPlugin(),
        PreviewPlugin(),
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        InboxPlugin(),
      ],
    }),
  ],
};
