//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { type SlackChannel, type SlackConnectionStatus } from '#types';

const SLACK_API = 'https://slack.com/api';

/** Lightweight Slack API client using fetch. No npm dependency needed. */
export const useSlackApi = (botToken?: string) => {
  const [status, setStatus] = useState<SlackConnectionStatus>(botToken ? 'disconnected' : 'disconnected');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [teamName, setTeamName] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const callSlack = useCallback(
    async (method: string, params?: Record<string, string>) => {
      if (!botToken) {
        throw new Error('No bot token configured');
      }
      // Use POST with form body to avoid CORS preflight issues.
      // Slack Web API supports token in the form body for all methods.
      const body = new URLSearchParams({ token: botToken, ...params });
      const response = await fetch(`${SLACK_API}/${method}`, {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!data.ok) {
        const detail = data.needed ? ` (need scope: ${data.needed})` : '';
        throw new Error(`${data.error ?? 'Slack API error'}${detail}`);
      }
      return data;
    },
    [botToken],
  );

  const testConnection = useCallback(async () => {
    if (!botToken) {
      setStatus('disconnected');
      return false;
    }

    setStatus('connecting');
    setError(undefined);
    try {
      const authData = await callSlack('auth.test');
      setTeamName(authData.team);
      setStatus('connected');

      // Paginate through all channels.
      const allChannels: SlackChannel[] = [];
      let cursor: string | undefined;
      do {
        const params: Record<string, string> = {
          types: 'public_channel,private_channel',
          limit: '200',
          exclude_archived: 'true',
        };
        if (cursor) {
          params.cursor = cursor;
        }
        const channelsData = await callSlack('conversations.list', params);
        const page: SlackChannel[] = (channelsData.channels ?? []).map(
          (channel: { id: string; name: string; is_member: boolean }) => ({
            id: channel.id,
            name: channel.name,
            isMember: channel.is_member,
          }),
        );
        allChannels.push(...page);
        cursor = channelsData.response_metadata?.next_cursor || undefined;
      } while (cursor);

      allChannels.sort((first, second) => first.name.localeCompare(second.name));
      setChannels(allChannels);
      return true;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [botToken, callSlack]);

  const postMessage = useCallback(
    async (channelId: string, text: string, threadTs?: string) => {
      const params: Record<string, string> = { channel: channelId, text };
      if (threadTs) {
        params.thread_ts = threadTs;
      }
      return callSlack('chat.postMessage', params);
    },
    [callSlack],
  );

  return { status, channels, teamName, error, testConnection, postMessage };
};
