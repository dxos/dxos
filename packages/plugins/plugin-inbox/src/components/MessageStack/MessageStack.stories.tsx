//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes, useSelected } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { Builder, LABELS, MessagesOptions, initializeMailbox } from '#testing';
import { Mailbox } from '#types';

import { InboxPlugin } from '../../InboxPlugin';
import { MessageStack, MessageStackProps } from './MessageStack';

const DefaultStory = ({
  count = 0,
  options,
  ...props
}: MessageStackProps & { count?: number; options?: MessagesOptions }) => {
  const [messages] = useState(() =>
    count ? new Builder().createMessages(count, options).build().messages : undefined,
  );

  return <MessageStack {...props} messages={messages} />;
};

const CompanionStory = () => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0].id);
  const [mailbox] = useQuery(db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;

  // Selected message.
  const selected = useSelected(feed ? Obj.getDXN(feed).toString() : undefined, 'single');
  const message = useQuery(
    db,
    feed ? Query.select(selected ? Filter.id(selected) : Filter.nothing()).from(feed) : Query.select(Filter.nothing()),
  )[0];

  const mailboxData = useMemo(() => ({ subject: mailbox, attendableId: mailbox?.id }), [mailbox]);
  const companionData = useMemo(() => ({ subject: message ?? 'message', companionTo: feed }), [message, feed]);

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(feed ? Obj.getDXN(feed).toString() : undefined);

  if (!db || !feed) {
    return <Loading data={{ db: !!db, feed: !!feed }} />;
  }

  return (
    <div role='none' {...attentionAttrs} className='grid grid-cols-[1fr_1fr]'>
      <Surface.Surface type={AppSurface.Article} data={mailboxData} />
      <Surface.Surface type={AppSurface.Article} data={companionData} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/MessageStack',
  component: MessageStack,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MessageStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'story',
  },
};

export const WithMessages: Story = {
  args: {
    id: 'story',
    labels: LABELS,
    count: 100,
  },
};

export const WithThreads: Story = {
  args: {
    id: 'story',
    labels: LABELS,
    threads: true,
    count: 100,
    options: {
      threads: 10,
    },
  },
};

export const WithCompanion = {
  render: CompanionStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              // TODO(wittjosiah): Share message builder with transcription stories. Factor out to @dxos/schema/testing.
              const mailbox = yield* Effect.promise(() => initializeMailbox(personalSpace));
              log.info('mailbox', { id: mailbox.id });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    }),
  ],
};
