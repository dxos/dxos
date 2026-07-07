//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { Config } from '@dxos/react-client';
import { useDatabase, useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

import { MeetingPlugin } from '../MeetingPlugin';
import { Meeting } from '../types';

//
// LIVE story: this joins a real Cloudflare RealtimeKit meeting through the edge and streams native
// transcription into the meeting's transcript feed. It requires a network + microphone and is NOT a CI
// test (nothing runs until the toolbar buttons are clicked).
//
// The join routes through the edge worker's `/calls/*` proxy (which forwards to calls-service and
// provides `/auth`), so EDGE_URL must point at an edge deployment carrying that proxy + the RealtimeKit
// join route (dxos/edge#685). For local end-to-end, run the edge dev stack
// (`DX_PARALLEL_WRANGLER_DEV=1 START_HUB=1 START_CALLS=1 moon run edge:dev`) and set EDGE_URL to
// http://localhost:8787/. CALLS_URL only backs the direct `/transcribe` endpoint (unused by native
// meeting transcription).
//
const LOCAL = true;
const EDGE_URL = LOCAL ? 'http://localhost:8787/' : 'https://edge.dxos.workers.dev/';
const CALLS_URL = 'https://calls-service.dxos.workers.dev';

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
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
 * Two-column live view: the call's video/participant grid beside the meeting hub whose Transcript tab
 * reflects the live feed. The toolbar drives the real production path — `callManager.join()` establishes
 * the RealtimeKit meeting via the edge, and toggling transcription publishes the meeting activity that
 * enables native transcription; segments then flow through the call-extension bridge into the feed.
 */
const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionViewProps) => {
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];
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

  const handleToggleTranscription = useCallback(async () => {
    if (!callManager) {
      return;
    }
    // Mirrors the meeting graph action: publish the meeting activity so `handle-payload` binds the feed
    // and enables transcription; the call manager then writes its own native segments straight to that feed.
    const feed = transcript.feed.target;
    const feedUri = feed && Feed.getFeedUri(feed);
    if (!feedUri) {
      log.warn('transcript feed has no feed URI');
      return;
    }
    const next = !transcribing;
    callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
      meetingId: roomId,
      transcriptDxn: feedUri.toString(),
      transcriptionEnabled: next,
    });
    setTranscribing(next);
  }, [callManager, transcribing, transcript, roomId]);

  return (
    <div className='dx-container flex flex-col gap-2'>
      <Toolbar.Root>
        <IconButton
          icon={joined ? 'ph--phone-x--regular' : 'ph--phone-call--regular'}
          label={joined ? 'Leave call' : 'Start call'}
          disabled={!callManager}
          onClick={handleToggleCall}
        />
        <IconButton
          icon={transcribing ? 'ph--subtitles-slash--regular' : 'ph--subtitles--regular'}
          label={transcribing ? 'Stop transcription' : 'Start transcription'}
          disabled={!joined}
          onClick={handleToggleTranscription}
        />
      </Toolbar.Root>
      <div className='grid grid-cols-2 gap-2 grow min-bs-0'>
        <div className='dx-expander'>
          <Surface.Surface type={AppSurface.Article} data={{ subject: { roomId }, attendableId: roomId }} limit={1} />
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
    withPluginManager<StoryArgs>(() => ({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Transcript.Transcript, Meeting.Meeting, Text.Text],
          // CallManager requires the edge service config to construct; the calls-service override points
          // the RealtimeKit join route (edge#685) at a deployment that serves it.
          config: new Config({
            runtime: {
              services: {
                edge: { url: EDGE_URL },
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
