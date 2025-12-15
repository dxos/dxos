//
// Copyright 20255555 DXOS.org
//

import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { useEffect } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

export type RealTimeKitStoryProps = {
  authToken?: string;
};

const MEETING_ID = 'bbba67f8-fa44-4b1d-b48c-bb3cd806bc33';
const BASE_URL = 'http://localhost:8787/api/v2';
// const BASE_URL = 'https://calls-service.dxos.workers.dev/api/v2';

export class RealtimeHttpClient {
  constructor(private readonly _baseUrl: string) {}

  async join({
    meetingId,
    customId,
    presetName,
    name,
    picture,
  }: {
    meetingId: string;
    customId: string;
    presetName:
      | 'group_call_guest'
      | 'group_call_host'
      | 'group_call_participant'
      | 'livestream_host'
      | 'livestream_viewer'
      | 'webinar_presenter'
      | 'webinar_viewer';
    name?: string;
    picture?: string;
  }): Promise<
    | {
        success: true;
        data: {
          id: string;
          token: string;
          created_at: string;
          custom_participant_id: string;
          preset_name: string;
          updated_at: string;
          name?: string;
          picture?: string;
        };
      }
    | { success: false }
  > {
    const response = await this._call(`/meetings/${meetingId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        custom_participant_id: customId,
        presetName: presetName,
        ...(name ? { name } : {}),
        ...(picture ? { picture } : {}),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async leave({
    meetingId,
    participantId,
  }: {
    meetingId: string;
    participantId: string;
  }): Promise<{ success: boolean }> {
    const response = await this._call(`/meetings/${meetingId}/participants/${participantId}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  private _call(path: string, requestInit?: RequestInit) {
    return fetch(`${this._baseUrl}${path}`, requestInit);
  }
}

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
