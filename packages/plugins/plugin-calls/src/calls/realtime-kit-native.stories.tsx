//
// Copyright 2026 DXOS.org
//

import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { RealtimeHttpClient } from './realtimekit-http-client';

//
// NATIVE RealtimeKit demo: renders Cloudflare's own prebuilt meeting UI (`RtkMeeting` from
// `@cloudflare/realtimekit-react-ui`) driven by the RealtimeKit React client. It mints a participant token
// by calling the calls-service RealtimeKit REST proxy directly (no DXOS swarm / coordination / transport),
// so it's the baseline reference for the raw RealtimeKit experience — distinct from the DXOS-integrated
// `RealtimeKitTransport` used by the loopback/meeting stories.
//
// Requires the calls-service RealtimeKit participant API at `${BASE_URL}` and `MEETING_ID` to be a real
// meeting on the app. Nothing runs until mounted.
//
const LOCAL = true;
const BASE_URL = LOCAL ? 'http://localhost:8787/api/v2' : 'https://calls-service.dxos.workers.dev/api/v2';

// A real RealtimeKit meeting id on the configured app (create one via `POST ${BASE_URL}/meetings`).
const MEETING_ID = 'bbb541b1-97c1-45bd-9120-00e19a699adb';

type TranscriptionData = {
  id: string;
  name: string;
  peerId: string;
  userId: string;
  customParticipantId: string;
  transcript: string;
  isPartialTranscript: boolean;
  date: Date;
};

const Story = () => {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const httpClient = useMemo(() => new RealtimeHttpClient(BASE_URL), []);
  const [, setParticipantId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const ctx = new Context();
    let joinedParticipantId: string | undefined;
    scheduleTask(ctx, async () => {
      const customId = `storybook_test_${Math.random().toString(36).substring(2, 10)}`;
      const result = await httpClient.join({
        meetingId: MEETING_ID,
        customId,
        presetName: 'group_call_host',
        name: 'Storybook User',
      });
      if (!result.success) {
        throw new Error('failed to join RealtimeKit meeting');
      }

      const { token, id } = result.data;
      joinedParticipantId = id;
      setParticipantId(id);
      await initMeeting({ authToken: token, defaults: { audio: false, video: false } });
    });

    return () => {
      void ctx.dispose();
      if (joinedParticipantId) {
        void httpClient.leave({ meetingId: MEETING_ID, participantId: joinedParticipantId });
      }
    };
  }, [initMeeting, httpClient]);

  const hadRun = useRef(false);
  useEffect(() => {
    const handler = (data: TranscriptionData) => {
      log.info('transcript received', data);
    };
    if (meeting && !hadRun.current) {
      hadRun.current = true;
      meeting.ai.on('transcript', handler);
    }
    return () => {
      meeting?.ai.off('transcript', handler);
    };
  }, [meeting]);

  return <RtkMeeting meeting={meeting} />;
};

const meta = {
  title: 'plugins/plugin-calls/experimental/NativeRealtimeKit',
  component: Story,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof Story>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
