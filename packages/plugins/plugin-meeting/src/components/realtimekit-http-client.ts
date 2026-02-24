//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

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
        presetName: presetName,
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
  /**
   * The AI Config allows you to customize the behavior of meeting transcriptions and summaries
   */
  ai_config?: {
    /**
     * Summarization configuration.
     */
    summarization?: {
      /**
       * The type of summary to generate.
       */
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
      /**
       * The output format of the summary.
       */
      text_format?: 'plain_text' | 'markdown';
      /**
       * The maximum number of words in the summary.
       */
      word_limit?: number;
    };
    /**
     * Transcription configuration.
     */
    transcription?: {
      /**
       * A list of keywords to improve transcription quality.
       */
      keywords?: string[];

      /**
       * Specifies the language code for transcription to ensure accurate results.
       */
      language?: 'en-US' | 'en-IN' | 'de' | 'hi' | 'sv' | 'ru' | 'pl' | 'el' | 'fr' | 'nl';
      /**
       * Control the inclusion of offensive language in transcriptions.
       */
      profanity_filter?: boolean;
    };
  };
  /**
   * The meeting title.
   */
  title?: string;
  /**
   * Specifies if the meeting should start getting recorded as soon as someone joins the meeting.
   */
  record_on_start?: boolean;
  /**
   * Specifies if the meeting should start getting livestreamed on start.
   */
  live_stream_on_start?: boolean;
  /**
   * If a meeting is set to persist_chat, meeting chat would remain for a week within the meeting space.
   */
  persist_chat?: boolean;
  /**
   * Recording Configurations to be used for this meeting. This level of configs takes higher preference over App level configs on the RealtimeKit developer portal.
   */
  recording_config?: {
    /**
     * Audio recording configuration.
     */
    audio_config?: {
      /**
       * The audio channel layout.
       */
      channel?: 'mono' | 'stereo';
      /**
       * The audio codec.
       */
      codec?: 'MP3' | 'AAC' | (string & {});
      /**
       * Whether to export an audio file.
       */
      export_file?: boolean;
    };
    /**
     * Prefix for output recording file names.
     */
    file_name_prefix?: string;
    /**
     * Live streaming configuration.
     */
    live_streaming_config?: {
      /**
       * RTMP URL to stream to.
       */
      rtmp_url?: string;
    };
    /**
     * Maximum duration of the recording in seconds.
     */
    max_seconds?: number;
    /**
     * Whether to store recordings in a RealtimeKit-managed bucket.
     */
    realtimekit_bucket_config?: {
      /**
       * Whether RealtimeKit bucket storage is enabled.
       */
      enabled?: boolean;
    };
    /**
     * External storage configuration.
     */
    storage_config?: {
      /**
       * The storage provider type.
       */
      type?: 'aws' | 'gcp' | 'azure' | (string & {});
      /**
       * The authentication method used for the storage provider.
       */
      auth_method?: 'KEY' | 'PASSWORD' | (string & {});
      /**
       * Storage bucket name.
       */
      bucket?: string;
      /**
       * Storage endpoint hostname.
       */
      host?: string;
      /**
       * Password for storage authentication.
       */
      password?: string;
      /**
       * Path/prefix within the bucket.
       */
      path?: string;
      /**
       * Storage endpoint port.
       */
      port?: number;
      /**
       * Private key for storage authentication.
       */
      private_key?: string;
      /**
       * Storage region.
       */
      region?: string;
      /**
       * Secret for storage authentication.
       */
      secret?: string;
      /**
       * Username for storage authentication.
       */
      username?: string;
    };
    /**
     * Video recording configuration.
     */
    video_config?: {
      /**
       * The video codec.
       */
      codec?: 'H264' | 'VP8' | (string & {});
      /**
       * Whether to export a video file.
       */
      export_file?: boolean;
      /**
       * Output video height.
       */
      height?: number;
      /**
       * Output video width.
       */
      width?: number;
      /**
       * Optional watermark configuration.
       */
      watermark?: {
        /**
         * Watermark position.
         */
        position?: string;
        /**
         * Watermark size.
         */
        size?: {
          /**
           * Watermark height.
           */
          height?: number;
          /**
           * Watermark width.
           */
          width?: number;
        };
        /**
         * Watermark URL.
         */
        url?: string;
      };
    };
  };
  /**
   * Time in seconds, for which a session remains active, after the last participant has left the meeting.
   */
  session_keep_alive_time_in_secs?: number;
  /**
   * Automatically generate summary of meetings using transcripts. Requires Transcriptions to be enabled, and can be retrieved via Webhooks or summary API.
   */
  summarize_on_end?: boolean;
};
