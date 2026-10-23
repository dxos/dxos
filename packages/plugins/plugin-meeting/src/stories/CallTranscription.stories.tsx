//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

import { MeetingPlugin } from '#plugin';
import { Meeting } from '#types';

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const [space] = useSpaces();
  const [meeting] = useQuery(space?.db, Filter.type(Meeting.Meeting));
  const transcript = meeting?.transcript?.target;

  if (!space?.db || !meeting || !transcript) {
    return <Loading data={{ db: !!space?.db, meeting: !!meeting, transcript: !!transcript }} />;
  }

  return <CallTranscriptionView meeting={meeting} transcript={transcript} />;
};

type CallTranscriptionViewProps = {
  meeting: Meeting.Meeting;
  transcript: Transcript.Transcript;
};

/**
 * Two-column live view: the call's video/participant grid beside the meeting hub whose Transcript tab reflects the
 * live feed. The toolbar drives the production path: `join()` opens a RealtimeKit meeting through EDGE, and toggling
 * transcription publishes the meeting activity that binds the feed, after which each participant's native segments
 * reach it through the call manager. Needs a network, a microphone and an EDGE serving `/calls/rooms/join`.
 */
const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionViewProps) => {
  const callManager = Hooks.useCapabilities(CallsCapabilities.Manager)[0];
  const roomId = Obj.getURI(meeting);

  const [joined, setJoined] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const handleToggleCall = useCallback(async () => {
    if (!callManager) {
      return;
    }
    if (joined) {
      await callManager.leave().catch((err) => log.catch(err));
      setJoined(false);
      setTranscribing(false);
    } else {
      callManager.setRoomId(roomId);
      await callManager.join().catch((err) => log.catch(err));
      setJoined(true);
    }
  }, [callManager, joined, roomId]);

  const handleToggleTranscription = useCallback(() => {
    const feed = transcript.feed.target;
    const feedUri = feed && Feed.getFeedUri(feed);
    const typename = Type.getTypename(Meeting.Meeting);
    if (!callManager || !feedUri || !typename) {
      return;
    }
    const next = !transcribing;
    callManager.setActivity(typename, {
      meetingId: roomId,
      transcriptDxn: feedUri.toString(),
      transcriptionEnabled: next,
    });
    setTranscribing(next);
  }, [callManager, transcribing, transcript, roomId]);

  return (
    <div className='dx-expand flex flex-col gap-2'>
      <Toolbar.Root>
        <Button.Root
          icon={joined ? 'ph--phone-x--regular' : 'ph--phone-call--regular'}
          label={joined ? 'Leave call' : 'Start call'}
          disabled={!callManager}
          onClick={handleToggleCall}
        />
        <Button.Root
          icon={transcribing ? 'ph--subtitles-slash--regular' : 'ph--subtitles--regular'}
          label={transcribing ? 'Stop transcription' : 'Start transcription'}
          disabled={!joined}
          onClick={handleToggleTranscription}
        />
      </Toolbar.Root>
      <div className='grid grid-cols-2 gap-2 dx-grow'>
        <div className='dx-expand'>
          <Surface.Surface type={AppSurface.Article} data={{ subject: { roomId }, attendableId: roomId }} limit={1} />
        </div>
        <div className='dx-expand'>
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: meeting, attendableId: Obj.getURI(meeting) }}
            limit={1}
          />
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-meeting/stories/CallTranscription',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(() => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Feed.Feed, Transcript.Transcript, Meeting.Meeting, Text.Text],
          // CallManager requires the edge service config to construct (it throws otherwise).
          config: new Config({
            runtime: {
              services: {
                edge: { url: 'https://dev.dxos.network/' },
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);

              // The Meeting hub owns notes + summary + transcript; the MeetingArticle reads them.
              const transcriptFeed = defaultSpace.db.add(Feed.make());
              const transcript = defaultSpace.db.add(Transcript.make(Ref.make(transcriptFeed)));
              const meetingNotes = defaultSpace.db.add(Text.make({ content: '' }));
              const meetingSummary = defaultSpace.db.add(Text.make({ content: '' }));

              defaultSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(meetingNotes),
                  summary: Ref.make(meetingSummary),
                }),
              );

              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin.make({}),
        CallsPlugin.make(),
        TranscriptionPlugin.make(),
        MeetingPlugin(),
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
