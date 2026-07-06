//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Thin REST client for the calls-service RealtimeKit participant API, used by the native RealtimeKit
 * storybook to mint a participant auth token directly (no DXOS swarm/coordination). Mirrors the shape of
 * the Cloudflare RealtimeKit REST API proxied by the calls-service.
 */
export class RealtimeHttpClient {
  constructor(private readonly _baseUrl: string) {}

  async createMeeting(params: CreateMeetingParams): Promise<{ success: boolean }> {
    return this._call('/meetings', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

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
    return this._call(`/meetings/${meetingId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        custom_participant_id: customId,
        presetName,
        ...(name ? { name } : {}),
        ...(picture ? { picture } : {}),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async leave({
    meetingId,
    participantId,
  }: {
    meetingId: string;
    participantId: string;
  }): Promise<{ success: boolean }> {
    return this._call(`/meetings/${meetingId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  private async _call(path: string, requestInit?: RequestInit) {
    const response = await fetch(`${this._baseUrl}${path}`, requestInit);
    if (!response.ok) {
      log.error(`HTTP error: ${response.status}`, { text: await response.clone().text() });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

export type CreateMeetingParams = {
  /** Customize the behavior of meeting transcriptions and summaries. */
  ai_config?: {
    summarization?: {
      summary_type?:
        | 'general'
        | 'team_meeting'
        | 'sales_call'
        | 'client_check_in'
        | 'interview'
        | 'daily_standup'
        | 'one_on_one_meeting'
        | 'lecture'
        | 'code_review';
      text_format?: 'plain_text' | 'markdown';
      word_limit?: number;
    };
    transcription?: {
      keywords?: string[];
      language?: 'en-US' | 'en-IN' | 'de' | 'hi' | 'sv' | 'ru' | 'pl' | 'el' | 'fr' | 'nl';
      profanity_filter?: boolean;
    };
  };
  title?: string;
  record_on_start?: boolean;
  live_stream_on_start?: boolean;
  persist_chat?: boolean;
  session_keep_alive_time_in_secs?: number;
  summarize_on_end?: boolean;
};
