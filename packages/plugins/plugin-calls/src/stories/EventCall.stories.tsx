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
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Config } from '@dxos/react-client';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { Calendar } from '@dxos/plugin-inbox/types';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Actor, Event, Transcript } from '@dxos/types';

import { CallsPlugin } from '../CallsPlugin';
import { Call } from '../types';

type StoryProps = {};

const DefaultStory = (_: StoryProps) => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const calendars = useQuery(db, Filter.type(Calendar.Calendar));
  const events = useQuery(db, Filter.type(Event.Event));
  const calls = useQuery(db, Filter.type(Call.Call));
  const calendar = calendars[0];
  const event = events[0];
  const call = calls[0];

  if (!db || !calendar || !event || !call) {
    return <Loading data={{ db: !!db, calendar: !!calendar, event: !!event, call: !!call }} />;
  }

  return (
    <div className='grid grid-cols-2 min-h-0 is-full bs-full'>
      <div className='min-h-0 border-ie border-separator'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: event, companionTo: calendar, attendableId: Obj.getURI(event) }}
          limit={1}
        />
      </div>
      <div className='min-h-0'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: call, attendableId: Obj.getURI(call) }}
          limit={1}
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/stories/EventAndCall',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryProps>(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Calendar.Calendar, Event.Event, Transcript.Transcript, Call.Call, Text.Text],
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
              const eventNotes = personalSpace.db.add(
                Text.make({ content: '# Agenda\n\n- Review roadmap\n- Assign owners\n- Schedule follow-up' }),
              );
              personalSpace.db.add(
                Event.make({
                  title: 'Quarterly Planning',
                  description: 'Plan the next quarter.',
                  owner,
                  attendees: [owner, { name: 'Bob', email: 'bob@example.com' }],
                  startDate: now.toISOString(),
                  endDate: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
                  notes: Ref.make(eventNotes),
                }),
              );

              // Call requires resolvable notes + summary refs for CallArticle to render (returns null otherwise).
              const transcriptFeed = personalSpace.db.add(Feed.make());
              const transcript = personalSpace.db.add(Transcript.make(Ref.make(transcriptFeed)));
              const callNotes = personalSpace.db.add(
                Text.make({ content: 'Discussed the roadmap and assigned action items.' }),
              );
              const callSummary = personalSpace.db.add(
                Text.make({ content: '## Summary\n\n- Roadmap reviewed.\n- Owners assigned.\n- Follow-up scheduled.' }),
              );
              personalSpace.db.add(
                Call.make({
                  name: 'Standup',
                  transcript: Ref.make(transcript),
                  notes: Ref.make(callNotes),
                  summary: Ref.make(callSummary),
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        CallsPlugin(),
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
