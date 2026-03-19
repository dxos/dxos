//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { Feed } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useDatabase, useQuery } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { InboxPlugin } from '../../InboxPlugin';
import { createEvents } from '../../testing';
import { Calendar } from '../../types';

import { CalendarArticle } from './CalendarArticle';

const DefaultStory = () => {
  const db = useDatabase();
  const calendars = useQuery(db, Filter.type(Calendar.Calendar));
  const calendar = calendars[0];
  const operationInvokers = useCapabilities(Capabilities.OperationInvoker);

  if (!db || !calendar || operationInvokers.length === 0) {
    return <Loading data={{ db: !!db, calendar: !!calendar, operationInvoker: operationInvokers.length > 0 }} />;
  }

  return <CalendarArticle subject={calendar} />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/CalendarArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withAttention(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Calendar.Calendar],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              const space = client.spaces.default;
              yield* Effect.promise(() => space.waitUntilReady());

              // Create calendar with backing feed.
              const calendar = space.db.add(Calendar.make({ name: 'My Calendar' }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));

              // Populate the calendar's feed with events.
              const feed = yield* Effect.tryPromise(() => calendar.feed!.tryLoad());
              if (feed) {
                const events = createEvents(10);
                yield* Feed.append(feed, events).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
              }

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),

        StorybookPlugin({}),
        InboxPlugin(),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
