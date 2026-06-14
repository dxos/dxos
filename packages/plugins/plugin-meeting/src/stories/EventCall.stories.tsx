//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { Call } from '@dxos/plugin-calls/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { Calendar } from '@dxos/plugin-inbox/types';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { TagIndex, Text } from '@dxos/schema';
import { Actor, AnchoredTo, Event, Transcript } from '@dxos/types';

import { MeetingPlugin } from '../MeetingPlugin';
import { Meeting } from '../types';

type StoryProps = {};

const DefaultStory = (_: StoryProps) => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const [calendar] = useQuery(db, Filter.type(Calendar.Calendar));
  // Events live in the calendar's feed (simulating Google sync), so query from the feed, not the db.
  const feed = calendar?.feed?.target;
  const events = useQuery(
    db,
    feed ? Query.select(Filter.type(Event.Event)).from(feed) : Query.select(Filter.nothing()),
  );
  const [meeting] = useQuery(db, Filter.type(Meeting.Meeting));
  const [call] = useQuery(db, Filter.type(Call.Call));
  // The selected feed event (first by chronological order from the builder).
  const event = events[0];

  if (!db || !calendar || !event || !meeting || !call) {
    return <Loading data={{ db: !!db, calendar: !!calendar, event: !!event, meeting: !!meeting, call: !!call }} />;
  }

  return (
    <div className='dx-container grid grid-cols-3 gap-2'>
      <div className='dx-expander'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: event, attendableId: Obj.getURI(event), companionTo: calendar }}
          limit={1}
        />
      </div>
      <div className='dx-expander'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
          limit={1}
        />
      </div>
      <div className='dx-expander'>
        <Surface.Surface type={AppSurface.Article} data={{ subject: call, attendableId: Obj.getURI(call) }} limit={1} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-meeting/stories/EventAndCall',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryProps>(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Feed.Feed,
            Calendar.Calendar,
            Event.Event,
            Transcript.Transcript,
            Call.Call,
            Meeting.Meeting,
            AnchoredTo.AnchoredTo,
            Text.Text,
            // Calendar.make() creates a child TagIndex (for starred events); register so it persists.
            TagIndex.TagIndex,
          ],
          // CallManager requires the edge service config to construct (it throws otherwise).
          config: new Config({
            runtime: {
              services: {
                edge: { url: 'https://edge.dxos.workers.dev/' },
                iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              // Calendar with a backing feed. Events are appended to the feed to simulate the
              // Google Calendar sync (synced events live in the feed, not the db).
              const calendar = personalSpace.db.add(Calendar.make({ name: 'My Calendar' }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              const feed = yield* Effect.tryPromise(() => calendar.feed!.tryLoad());
              invariant(feed, 'Calendar is feed-backed.');
              const now = new Date();
              const owner: Actor.Actor = { name: 'Alice', email: 'alice@example.com' };
              const hour = 60 * 60 * 1000;
              // Stamp a Google foreign key so these read as *synced* (read-only) events, not local drafts.
              // Without it `DraftEvent.isDraft` is true and EventArticle renders the live editor, which
              // throws on a feed snapshot ("expect obj to be a LiveObject").
              const makeSyncedEvent = (id: string, props: Parameters<typeof Event.make>[0]) =>
                Obj.make(Event.Event, {
                  [Obj.Meta]: { keys: [{ source: 'google.com', id }] },
                  attendees: [],
                  ...props,
                });
              const events = [
                makeSyncedEvent('event-1', {
                  title: 'Quarterly Planning',
                  description: 'Plan the next quarter.',
                  owner,
                  attendees: [owner, { name: 'Bob', email: 'bob@example.com' }],
                  startDate: now.toISOString(),
                  endDate: new Date(now.getTime() + hour).toISOString(),
                }),
                makeSyncedEvent('event-2', {
                  title: 'Design Review',
                  owner,
                  attendees: [owner],
                  startDate: new Date(now.getTime() + 2 * hour).toISOString(),
                  endDate: new Date(now.getTime() + 3 * hour).toISOString(),
                }),
              ];
              yield* Feed.append(feed, events).pipe(Effect.provide(createFeedServiceLayer(personalSpace.queues)));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              // Re-read via the queue query: these objects carry their queue URI, so `Ref.make` produces a
              // ref the Meeting can hold (a plain `db.query(...).from(feed)` snapshot would not).
              const synced = yield* Feed.runQuery(feed, Filter.type(Event.Event)).pipe(
                Effect.provide(createFeedServiceLayer(personalSpace.queues)),
              );
              const event = synced[0];

              // The Meeting hub owns notes + summary + transcript; the MeetingArticle reads them.
              const transcriptFeed = personalSpace.db.add(Feed.make());
              const transcript = personalSpace.db.add(Transcript.make(Ref.make(transcriptFeed)));
              const meetingNotes = personalSpace.db.add(
                Text.make({ content: 'Discussed the roadmap and assigned action items.' }),
              );
              const meetingSummary = personalSpace.db.add(
                Text.make({ content: '## Summary\n\n- Roadmap reviewed.\n- Owners assigned.\n- Follow-up scheduled.' }),
              );
              // Slim Call (room/transport) the Meeting optionally links to.
              // The transport config is provider-owned; any object stands in for the story.
              const transportConfig = personalSpace.db.add(Text.make({ content: 'room-1' }));
              const call = personalSpace.db.add(
                Call.make({
                  name: 'Standup',
                  transport: { kind: 'org.dxos.call.transport.cloudflare', config: Ref.make(transportConfig) },
                }),
              );
              // `event` is a Ref to the feed event (works for queue objects); EventDetails reverse-matches it.
              const meeting = personalSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(meetingNotes),
                  summary: Ref.make(meetingSummary),
                  call: Ref.make(call),
                  ...(event ? { event: Ref.make(event) } : {}),
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        CallsPlugin(),
        MeetingPlugin(),
        MarkdownPlugin(),
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

export const Default: Story = {};
