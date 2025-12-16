//
// Copyright 20255555 DXOS.org
//

import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef, useState } from 'react';
import { useEffect } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { RealtimeHttpClient } from './realtimekit-http-client';

export type RealTimeKitStoryProps = {
  authToken?: string;
};

const MEETING_ID = 'bbba67f8-fa44-4b1d-b48c-bb3cd806bc33';
const BASE_URL = 'http://localhost:8787/api/v2';
// const BASE_URL = 'https://calls-service.dxos.workers.dev/api/v2';

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
  const httpClient = useMemo(() => new RealtimeHttpClient(BASE_URL), [BASE_URL]);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [participantId, setParticipantId] = useState<string | undefined>(undefined);

  useEffect(() => {});

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      const custom_id = `storybook_test_${Math.random().toString(36).substring(2, 10)}`;
      const result = await httpClient.join({
        meetingId: MEETING_ID,
        customId: custom_id,
        presetName: 'group_call_host',
        name: `Storybook User`,
      });
      if (!result.success) {
        throw new Error('failure');
      }
      const { token, id } = result.data;

      setToken(token);
      setParticipantId(id);
      await initMeeting({
        authToken: token,
        defaults: { audio: false, video: false },
      });
    });

    return () => {
      void ctx.dispose();
      if (participantId) {
        void httpClient.leave({ meetingId: MEETING_ID, participantId });
      }
    };
  }, [initMeeting]);

  const hadRun = useRef(false);
  useEffect(() => {
    const handler = (data: TranscriptionData) => {
      log.info('Transcript received:', data);
      log.info('Transcripts', { transcripts: meeting?.ai.transcripts });
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
  title: 'plugins/plugin-meeting/RealTimeKit',
  component: Story,
  decorators: [withTheme, withLayout({ container: 'column' })],
} satisfies Meta<typeof Story>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
