//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { Feed, Obj, Query } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useDatabase, useQuery } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { useAttentionAttributes, useSelected } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { Message, Person } from '@dxos/types';

import { InboxPlugin } from '../../InboxPlugin';
import { Builder, LABELS, initializeMailbox } from '../../testing';
import { Mailbox } from '../../types';

import { MessageStack as MessageStackComponent } from './MessageStack';

const DefaultStory = () => {
  const [messages] = useState(() => new Builder().createMessages(100).build().messages);
  return <MessageStackComponent id='story' messages={messages} ignoreAttention labels={LABELS} />;
};

const CompanionStory = () => {
  const db = useDatabase();
  const feeds = useQuery(db, Filter.type(Feed.Feed));
  const feed = feeds.find((f) => Mailbox.instanceOf(f));

  const selected = useSelected(feed ? Obj.getDXN(feed).toString() : undefined, 'single');
  const message = useQuery(
    db,
    feed ? Query.select(selected ? Filter.id(selected) : Filter.nothing()).from(feed) : Query.select(Filter.nothing()),
  )[0];

  const mailboxData = useMemo(() => ({ subject: feed }), [feed]);
  const companionData = useMemo(() => ({ subject: message ?? 'message', companionTo: feed }), [message, feed]);

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(feed ? Obj.getDXN(feed).toString() : undefined);

  if (!db || !feed) {
    return <Loading data={{ db: !!db, feed: !!feed }} />;
  }

  return (
    <div role='none' {...attentionAttrs} className='grid grid-cols-[1fr_1fr]'>
      <Surface.Surface role='article' data={mailboxData} />
      <Surface.Surface role='article' data={companionData} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/MessageStack',
  component: MessageStackComponent as any,
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme()],
};

export const WithCompanion: Story = {
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
              const { defaultSpace } = yield* initializeIdentity(client);
              // TODO(wittjosiah): Share message builder with transcription stories. Factor out to @dxos/schema/testing.
              yield* Effect.promise(() => initializeMailbox(defaultSpace));
            }),
        }),

        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    }),
  ],
};
