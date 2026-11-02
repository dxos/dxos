//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { addDays, addHours } from 'date-fns';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Event } from '@dxos/types';

import * as InboxPlugin from '#meta';
import { Builder } from '#testing';
import { translations } from '#translations';
import { Calendar } from '#types';

import { CalendarArticle } from './CalendarArticle.tsx';

/** Term seeded only into the titles of `SEARCH_TERM_COUNT` events (lorem titles never contain it); used by `SearchFilter`. */
const SEARCH_TERM = 'retrospective';
const SEARCH_TERM_COUNT = 3;

type StoryArgs = {
  count?: number;
  /** Seed `SEARCH_TERM_COUNT` extra events whose titles carry `SEARCH_TERM`. */
  seedSearchTerm?: boolean;
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
    withPluginManager<StoryArgs>(({ args: { count = 0, seedSearchTerm = false } }) => ({
      plugins: [
        ...CorePlugins.make(),
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
                const seeded = seedSearchTerm
                  ? Array.from({ length: SEARCH_TERM_COUNT }, (_, index) =>
                      Event.make({
                        title: `Sprint ${SEARCH_TERM} ${index + 1}`,
                        owner: events[0].owner,
                        attendees: [],
                        startDate: addDays(new Date(), index + 1).toISOString(),
                        endDate: addHours(addDays(new Date(), index + 1), 1).toISOString(),
                      }),
                    )
                  : [];
                yield* Feed.append(feed, [...events, ...seeded]).pipe(Effect.provide(Database.layer(defaultSpace.db)));
              }

              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),

        StorybookPlugin.make({}),
        InboxPlugin.make(),
        PreviewPlugin.make(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
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

// Integration test only: proves the toolbar's filter box is wired to the events query so that typing
// narrows the list; the selection itself is covered headlessly by `mailbox-search.test.ts`.
export const SearchFilter: Story = {
  args: {
    count: 10,
    seedSearchTerm: true,
  },
  play: async ({ canvasElement }) => {
    // Each event tile carries `data-object-id` (set by the shared `Mosaic.Tile` shell).
    const getTileCount = () => canvasElement.querySelectorAll('[data-object-id]').length;
    await waitFor(() => expect(getTileCount()).toBeGreaterThan(SEARCH_TERM_COUNT), { timeout: 12_000 });

    // The filter box is a CodeMirror `QueryEditor` — the only editor in the calendar toolbar.
    const getEditor = () => canvasElement.querySelector('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    await waitFor(() => expect(getEditor()).toBeTruthy(), { timeout: 12_000 });
    const editor = getEditor();
    if (!editor) {
      throw new Error('Calendar filter editor not found.');
    }
    await userEvent.click(editor);
    await userEvent.type(editor, SEARCH_TERM);

    await waitFor(() => expect(getTileCount()).toBe(SEARCH_TERM_COUNT), { timeout: 5_000 });
  },
};
