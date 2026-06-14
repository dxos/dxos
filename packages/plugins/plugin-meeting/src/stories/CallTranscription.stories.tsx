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
import { Call, CallsCapabilities } from '@dxos/plugin-calls/types';
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
  const [call] = useQuery(db, Filter.type(Call.Call));
  const transcript = meeting?.transcript?.target;

  if (!db || !meeting || !call || !transcript) {
    return <Loading data={{ db: !!db, meeting: !!meeting, call: !!call, transcript: !!transcript }} />;
  }

  return <CallTranscriptionView call={call} meeting={meeting} transcript={transcript} />;
};

type CallTranscriptionViewProps = {
  call: Call.Call;
  meeting: Meeting.Meeting;
  transcript: Transcript.Transcript;
};

/**
 * Two-column live view: the call's video/participant grid beside the meeting hub whose Transcript
 * tab reflects the live transcript feed. A story-local toolbar joins the call and toggles recording.
 */
const CallTranscriptionView = ({ call, meeting, transcript }: CallTranscriptionViewProps) => {
  // Optional: present only when plugin-calls is registered. No-op gracefully otherwise.
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];

  // Drive the mic -> transcriber -> transcript feed lifecycle. The hook tolerates a missing
  // mic/Whisper endpoint (clears `recording` on failure), so it is safe headlessly.
  const { recording, toggleRecording } = useTranscriptionRecording(transcript);

  // Provision the live room then join. Live peers require the Cloudflare SFU; headless the join
  // fails to connect but the grid UI still renders.
  const handleStartCall = useCallback(async () => {
    if (!callManager) {
      return;
    }
    callManager.setRoomId(Obj.getURI(call));
    await callManager.join().catch((err) => log.catch(err));
  }, [callManager, call]);

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
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: call, attendableId: Obj.getURI(call) }}
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
          types: [Feed.Feed, Transcript.Transcript, Call.Call, Meeting.Meeting, Text.Text],
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

              // Slim Call (room/transport) the Meeting links to. The transport config is
              // provider-owned; any object stands in for the story.
              const transportConfig = personalSpace.db.add(Text.make({ content: 'room-1' }));
              const call = personalSpace.db.add(
                Call.make({
                  name: 'Standup',
                  transport: { kind: 'org.dxos.call.transport.cloudflare', config: Ref.make(transportConfig) },
                }),
              );
              personalSpace.db.add(
                Obj.make(Meeting.Meeting, {
                  name: 'Standup',
                  participants: [],
                  transcript: Ref.make(transcript),
                  notes: Ref.make(meetingNotes),
                  summary: Ref.make(meetingSummary),
                  call: Ref.make(call),
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
