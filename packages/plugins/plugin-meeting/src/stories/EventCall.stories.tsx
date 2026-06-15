//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { Call } from '@dxos/plugin-calls/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph } from '@dxos/plugin-graph';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { Calendar } from '@dxos/plugin-inbox/types';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { TagIndex, Text } from '@dxos/schema';
import { Actor, AnchoredTo, Event, Transcript } from '@dxos/types';

import { MeetingPlugin } from '../MeetingPlugin';
import { Meeting } from '../types';

type StoryProps = {
  /** Seed a Meeting already linked to the event (toolbar shows "Open meeting"); otherwise "Create meeting". */
  withMeeting?: boolean;
};

const DefaultStory = (_: StoryProps) => {
  const [space] = useSpaces();
  const db = space?.db;
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

  const { graph } = useAppGraph();
  const eventUri = event ? Obj.getURI(event) : undefined;
  // Initialize (run the URI-keyed resolver to create the hidden Event node) and expand its action
  // relation, mirroring what plugin-deck's plank does for an attended node in the running app.
  useEffect(() => {
    if (!eventUri) {
      return;
    }

    void Graph.initialize(graph, eventUri).then(() => Graph.expand(graph, eventUri, 'action'));
  }, [graph, eventUri]);

  if (!db || !calendar || !event) {
    return <Loading data={{ db: !!db, calendar, event, call, meeting }} />;
  }

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <div className='dx-expander'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: event, attendableId: Obj.getURI(event), companionTo: calendar }}
          limit={1}
        />
      </div>
      {meeting && (
        <div className='dx-expander'>
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
            limit={1}
          />
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-meeting/stories/EventAndCall',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryProps>(({ args }) => ({
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
            // The Meeting links a Cloudflare-transport Call; register its config schema so `db.add` succeeds.
            Call.CloudflareTransportConfig,
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
              const { personalSpace: space } = yield* initializeIdentity(client);

              // Calendar with a backing feed. Events are appended to the feed to simulate the
              // Google Calendar sync (synced events live in the feed, not the db).
              const calendar = space.db.add(Calendar.make({ name: 'My Calendar' }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
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
              yield* Feed.append(feed, events).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
              // Re-read via the queue query: these objects carry their queue URI, so `Ref.make` produces a
              // ref the Meeting can hold (a plain `db.query(...).from(feed)` snapshot would not).
              const synced = yield* Feed.runQuery(feed, Filter.type(Event.Event)).pipe(
                Effect.provide(createFeedServiceLayer(space.queues)),
              );
              const event = synced[0];

              // The "Create meeting" variant seeds no meeting, so the contributed action resolves to its
              // create form rather than "Open meeting".
              if (args.withMeeting === false) {
                yield* Effect.promise(() => space.db.flush({ indexes: true }));
                return;
              }

              // The Meeting hub owns notes + summary + transcript; the MeetingArticle reads them.
              const transcriptFeed = space.db.add(Feed.make());
              const transcript = space.db.add(Transcript.make(Ref.make(transcriptFeed)));
              const meetingNotes = space.db.add(
                Text.make({ content: 'Discussed the roadmap and assigned action items.' }),
              );
              const meetingSummary = space.db.add(
                Text.make({ content: '## Summary\n\n- Roadmap reviewed.\n- Owners assigned.\n- Follow-up scheduled.' }),
              );

              // Slim Call (room/transport) the Meeting optionally links to.
              // The transport config is produced by the Cloudflare transport provider.
              const transportConfig = space.db.add(Obj.make(Call.CloudflareTransportConfig, { roomId: 'room-1' }));
              const call = space.db.add(
                Call.make({
                  name: 'Standup',
                  transport: { kind: Call.CLOUDFLARE_TRANSPORT_KIND, config: Ref.make(transportConfig) },
                }),
              );

              // `event` is a Ref to the feed event (works for queue objects); EventDetails reverse-matches it.
              const meeting = space.db.add(
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

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        CallsPlugin(),
        TranscriptionPlugin(),
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

export const Default: Story = {
  args: {
    withMeeting: true,
  },
};

/**
 * Asserts plugin-meeting's contributed "Open meeting" action renders in the Event-article toolbar.
 * The story seeds a Meeting already linked to the event, so the action resolves to its open variant.
 * This exercises the full graph: the article's `attendableId` is the event URI, plugin-inbox's
 * `eventObjectNode` resolver creates a hidden `Event.Event` node at that id, and plugin-meeting's
 * type extension attaches the action.
 */
export const MeetingAction: Story = {
  args: {
    withMeeting: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Contributed actions live in the event toolbar's "More" overflow. Two articles render, so open the
    // event toolbar's overflow (first in DOM order) and assert the action as a menu item (rendered in a portal).
    const [moreButton] = await canvas.findAllByRole('button', { name: 'More' }, { timeout: 10_000 });
    await userEvent.click(moreButton);
    // A meeting exists, so the action reads "Open meeting" (not "Create meeting").
    await expect(
      await screen.findByRole('menuitem', { name: 'Open meeting' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    await expect(screen.queryByRole('menuitem', { name: 'Create meeting' })).toBeNull();
  },
};

/**
 * Asserts the contributed action resolves to "Create meeting" when the event has no meeting yet.
 */
export const CreateMeetingAction: Story = {
  args: {
    withMeeting: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No meeting yet → the contributed action in the "More" overflow reads "Create meeting".
    const [moreButton] = await canvas.findAllByRole('button', { name: 'More' }, { timeout: 10_000 });
    await userEvent.click(moreButton);
    await expect(
      await screen.findByRole('menuitem', { name: 'Create meeting' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    await expect(screen.queryByRole('menuitem', { name: 'Open meeting' })).toBeNull();
  },
};
