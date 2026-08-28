//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { InboxPlugin } from '#plugin';
import { Builder } from '#testing';
import { Calendar } from '#types';

import { CalendarArticle } from './CalendarArticle';

type StoryArgs = {
  count?: number;
};

const DefaultStory = (_: StoryArgs) => {
  const [space] = useSpaces();
  const calendars = useQuery(space?.db, Filter.type(Calendar.Calendar));
  const calendar = calendars[0];
  if (!space?.db || !calendar) {
    return <Loading data={{ db: !!space?.db, calendar: !!calendar }} />;
  }

  return <CalendarArticle role='article' subject={calendar} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-inbox/containers/CalendarArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args: { count = 0 } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Feed.Feed, Calendar.Calendar],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);

              // Create calendar with backing feed.
              const calendar = defaultSpace.db.add(Calendar.make({ name: 'My Calendar' }));
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));

              // Populate the calendar's feed with events.
              const feed = yield* Effect.tryPromise(() => calendar.feed!.tryLoad());
              if (feed) {
                const { events } = new Builder().createEvents(count).build();
                yield* Feed.append(feed, events).pipe(Effect.provide(Database.layer(defaultSpace.db)));
              }

              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),

        StorybookPlugin.make({}),
        InboxPlugin(),
        PreviewPlugin.make(),
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
    count: 30,
  },
};

export const Empty: Story = {
  args: {
    count: 0,
  },
};
