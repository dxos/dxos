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
import { Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
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
import { Text } from '@dxos/schema';
import { Actor, AnchoredTo, Event, Transcript } from '@dxos/types';

import { MeetingPlugin } from '../MeetingPlugin';
import { Meeting } from '../types';

type StoryProps = {};

const DefaultStory = (_: StoryProps) => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const calendars = useQuery(db, Filter.type(Calendar.Calendar));
  const events = useQuery(db, Filter.type(Event.Event));
  const meetings = useQuery(db, Filter.type(Meeting.Meeting));
  const calls = useQuery(db, Filter.type(Call.Call));
  const calendar = calendars[0];
  const event = events[0];
  const meeting = meetings[0];
  const call = calls[0];

  if (!db || !calendar || !event || !meeting || !calls) {
    return <Loading data={{ db: !!db, calendar: !!calendar, event: !!event, meeting: !!meeting }} />;
  }

  return (
    <div className='dx-container grid grid-cols-3'>
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
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: call, attendableId: Obj.getURI(meeting) }}
          limit={1}
        />
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

              // Calendar (with backing feed) acts as the EventArticle companion and supplies the db.
              const calendar = personalSpace.db.add(Calendar.make({ name: 'My Calendar' }));

              // Standalone Event added directly to the db so EventArticle's `Filter.id(subject.id)`
              // query resolves the live, reactive object (feed-only events are not queryable by id).
              const now = new Date();
              const owner: Actor.Actor = { name: 'Alice', email: 'alice@example.com' };
              const event = personalSpace.db.add(
                Event.make({
                  title: 'Quarterly Planning',
                  description: 'Plan the next quarter.',
                  owner,
                  attendees: [owner, { name: 'Bob', email: 'bob@example.com' }],
                  startDate: now.toISOString(),
                  endDate: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
                }),
              );

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
              const meeting = personalSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  created: new Date().toISOString(),
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(meetingNotes),
                  summary: Ref.make(meetingSummary),
                  call: Ref.make(call),
                }),
              );

              // Anchor the meeting to the event so it surfaces as a relation chip in the Event header.
              personalSpace.db.add(AnchoredTo.make({ [Relation.Source]: meeting, [Relation.Target]: event }));

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
