//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useTranscriptionRecording } from '@dxos/plugin-transcription/hooks';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { Config } from '@dxos/react-client';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

import { MeetingPlugin } from '../MeetingPlugin';
import { Meeting } from '../types';

type StoryProps = {};

const DefaultStory = (_: StoryProps) => {
  const spaces = useSpaces();
  const db = useDatabase(spaces[0]?.id);
  const [meeting] = useQuery(db, Filter.type(Meeting.Meeting));
  const transcript = meeting?.transcript?.target;

  if (!db || !meeting || !transcript) {
    return <Loading data={{ db: !!db, meeting: !!meeting, transcript: !!transcript }} />;
  }

  return <CallTranscriptionView meeting={meeting} transcript={transcript} />;
};

type CallTranscriptionViewProps = {
  meeting: Meeting.Meeting;
  transcript: Transcript.Transcript;
};

/**
 * Two-column live view: the call's video/participant grid beside the meeting hub whose Transcript
 * tab reflects the live transcript feed. A story-local toolbar joins the call and toggles recording.
 */
const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionViewProps) => {
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];
  const roomId = Obj.getURI(meeting);

  const { recording, toggleRecording } = useTranscriptionRecording(transcript);

  const handleStartCall = useCallback(async () => {
    if (!callManager) {
      return;
    }
    callManager.setRoomId(roomId);
    await callManager.join().catch((err) => log.catch(err));
  }, [callManager, roomId]);

  return (
    <div className='dx-container flex flex-col gap-2'>
      <Toolbar.Root>
        <IconButton
          icon='ph--phone-call--regular'
          label='Start call'
          disabled={!callManager}
          onClick={handleStartCall}
        />
        <IconButton
          icon={recording ? 'ph--stop--regular' : 'ph--microphone--regular'}
          label={recording ? 'Stop transcription' : 'Start transcription'}
          onClick={toggleRecording}
        />
      </Toolbar.Root>
      <div className='grid grid-cols-2 gap-2 grow min-bs-0'>
        <div className='dx-expander'>
          <Surface.Surface type={CallsCapabilities.ArticleSurface} data={{ subject: { roomId }, attendableId: roomId }} limit={1} />
        </div>
        <div className='dx-expander'>
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
    withPluginManager<StoryProps>(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Transcript.Transcript, Meeting.Meeting, Text.Text],
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

              // The Meeting hub owns notes + summary + transcript; the MeetingArticle reads them.
              const transcriptFeed = personalSpace.db.add(Feed.make());
              const transcript = personalSpace.db.add(Transcript.make(Ref.make(transcriptFeed)));
              const meetingNotes = personalSpace.db.add(Text.make({ content: '' }));
              const meetingSummary = personalSpace.db.add(Text.make({ content: '' }));

              personalSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(meetingNotes),
                  summary: Ref.make(meetingSummary),
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        StorybookPlugin({}),
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

export const Default: Story = {};
