//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { type TranscriberParams, type Transcriber, type TranscriptionManager } from '../transcriber';

export namespace TranscriptionCapabilities {
  export type GetTranscriberProps = {
    audioStreamTrack: MediaStreamTrack;
    onSegments: TranscriberParams['onSegments'];
    config?: TranscriberParams['config'];
  };
  export type GetTranscriber = (props: GetTranscriberProps) => Transcriber;
  export const Transcriber = defineCapability<GetTranscriber>(`${TRANSCRIPTION_PLUGIN}/capability/transcriber`);

  export type MeetingTranscriptionState = Live<{
    transcriptionManager?: TranscriptionManager;
    enabled: boolean; // TODO(burdon): Move state into TranscriptionManager.
  }>;
  export const MeetingTranscriptionState = defineCapability<MeetingTranscriptionState>(
    `${TRANSCRIPTION_PLUGIN}/capability/meeting-transcription-state`,
  );
}
