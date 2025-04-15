//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type ReactiveObject } from '@dxos/live-object';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { type TranscriberParams, type Transcriber, type TranscriptionManager } from '../transcriber';

export namespace TranscriptionCapabilities {
  export type GetTranscriberProps = {
    audioStreamTrack: MediaStreamTrack;
    onSegments: TranscriberParams['onSegments'];
  };
  export type GetTranscriber = (props: GetTranscriberProps) => Transcriber;
  export const Transcriber = defineCapability<GetTranscriber>(`${TRANSCRIPTION_PLUGIN}/capability/transcriber`);

  export type MeetingTranscriptionState = ReactiveObject<{
    enabled: boolean;
    transcriptionManager?: TranscriptionManager;
  }>;
  export const MeetingTranscriptionState = defineCapability<MeetingTranscriptionState>(
    `${TRANSCRIPTION_PLUGIN}/capability/meeting-transcription-state`,
  );
}
