//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useDatabase, useQuery } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { InboxPlugin } from '../../InboxPlugin';
import { initializeMailbox } from '#testing';
import { Mailbox } from '#types';

import { MailboxArticle } from './MailboxArticle';

type DefaultStoryProps = {
  count?: number;
};

const DefaultStory = (_: DefaultStoryProps) => {
  const db = useDatabase();
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];
  if (!db || !mailbox) {
    return <Loading data={{ db: !!db, mailbox: !!mailbox }} />;
  }

  return <MailboxArticle subject={mailbox} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/MailboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<DefaultStoryProps>(({ args: { count = 0 } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => initializeMailbox(personalSpace, count));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),

        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    count: 100,
  },
};

export const Empty: Story = {
  args: {
    count: 0,
  },
};
