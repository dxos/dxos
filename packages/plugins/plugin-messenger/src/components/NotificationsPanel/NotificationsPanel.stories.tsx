//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Database, Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { useSpace } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization } from '@dxos/types';

import { translations } from '#translations';
import { Notifications } from '#types';

import { makeNotificationMessages } from '../../testing/fixtures.ts';
import { NotificationsPanel } from './NotificationsPanel.tsx';

/** Stands in for the deck companion's node id, so the toolbar takes attention like it does in the deck. */
const ATTENDABLE_ID = 'notifications-panel';

const DefaultStory = () => {
  const { spaceId } = useClientStory();
  const space = useSpace(spaceId);
  const containers = useQuery(space?.db, Filter.type(Notifications.Notifications));
  if (containers.length === 0) {
    return <Loading />;
  }

  return (
    <NotificationsPanel
      attendableId={ATTENDABLE_ID}
      containers={containers}
      renderInvitation={({ data, sender }) => (
        <Card.Text>{`${sender.name} invited you to ${data.spaceName}.`}</Card.Text>
      )}
      onOpen={(message) => console.log('open', message.id)}
    />
  );
};

const meta = {
  title: 'plugins/plugin-messenger/components/NotificationsPanel',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withAttention(),
    withMosaic(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Feed.Feed, Message.Message, Notifications.Notifications, Organization.Organization],
      onCreateSpace: async ({ space }) => {
        const linked = space.db.add(Organization.make({ name: 'Q3 planning' }));
        const notifications = space.db.add(Notifications.make());
        await space.db.flush();
        const feed = await notifications.feed.load();
        const { messages, read } = makeNotificationMessages({ linked });
        await EffectEx.runPromise(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(space.db))));
        Notifications.markRead([notifications], read);
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
