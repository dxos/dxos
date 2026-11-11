//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

import * as MeetingPlugin from '#meta';
import { Meeting } from '#types';

import { TranscriptSink } from '../transcript/index.ts';

/** What the scripted source says, one line per interval, standing in for a call or a microphone. */
const SCRIPT: readonly { speaker: string; text: string }[] = [
  { speaker: 'Anna', text: 'So I think we should ship the Munich release on Friday.' },
  { speaker: 'Ben', text: "Let's confirm the plan with the design team first." },
  { speaker: 'Anna', text: 'Agreed. We can review it together tomorrow morning.' },
  { speaker: 'Ben', text: "I'll send the agenda tonight." },
];

const LINE_INTERVAL_MS = 1_500;

const DefaultStory = () => {
  const [space] = useSpaces();
  const [meeting] = useQuery(space?.db, Filter.type(Meeting.Meeting));
  if (!space?.db || !meeting) {
    return <Loading data={{ db: !!space?.db, meeting: !!meeting }} />;
  }

  return <MeetingTranscriptView meeting={meeting} />;
};

/**
 * A meeting's transcript with no live call: a scripted source writes through the same `TranscriptSink` a call writes
 * through, into the meeting's feed, and the meeting's Transcript tab renders it. Runs offline, with no EDGE.
 */
const MeetingTranscriptView = ({ meeting }: { meeting: Meeting.Meeting }) => {
  const sink = useMemo(
    () =>
      new TranscriptSink({
        resolveTarget: async () => {
          const db = Obj.getDatabase(meeting);
          const transcript = await meeting.transcript.load();
          return db ? { db, feed: await transcript.feed.load() } : undefined;
        },
      }),
    [meeting],
  );

  const [running, setRunning] = useState(false);
  const next = useRef(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(() => {
      const line = SCRIPT[next.current++ % SCRIPT.length];
      void sink.write(
        { _tag: 'transcript', started: new Date().toISOString(), text: line.text },
        { name: line.speaker },
      );
    }, LINE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [running, sink]);

  const handleToggle = useCallback(() => setRunning((value) => !value), []);

  return (
    <div className='dx-expand flex flex-col gap-2'>
      <Toolbar.Root>
        <Button.Root
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause script' : 'Play script'}
          onClick={handleToggle}
        />
      </Toolbar.Root>
      <div className='dx-expand'>
        <Surface.Surface
          type={AppSurface.Article}
          data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
          limit={1}
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-meeting/stories/MeetingTranscript',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Feed.Feed, Transcript.Transcript, Meeting.Meeting, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const transcriptFeed = defaultSpace.db.add(Feed.make());
              const transcript = defaultSpace.db.add(Transcript.make(Ref.make(transcriptFeed)));
              defaultSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Planning',
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(defaultSpace.db.add(Text.make({ content: '' }))),
                  summary: Ref.make(defaultSpace.db.add(Text.make({ content: '' }))),
                }),
              );
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin.make({}),
        TranscriptionPlugin.make(),
        MeetingPlugin.make(),
        MarkdownPlugin.make(),
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

export const Default: Story = {};
