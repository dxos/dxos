//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import {
  type MediaStreamRecorderParams,
  type Transcriber,
  type TranscriberParams,
  type TranscriptMessageEnricher,
  type TranscriptionManager,
} from '../transcriber';

export namespace TranscriptionCapabilities {
  export type GetTranscriberProps = {
    audioStreamTrack: MediaStreamTrack;
    recorderConfig?: Partial<MediaStreamRecorderParams['config']>;
    transcriberConfig?: Partial<TranscriberParams['config']>;
    onSegments: TranscriberParams['onSegments'];
  };
  export type GetTranscriber = (props: GetTranscriberProps) => Transcriber;
  export const Transcriber = defineCapability<GetTranscriber>(`${TRANSCRIPTION_PLUGIN}/capability/transcriber`);

  export type GetTranscriptionManagerProps = {
    messageEnricher?: TranscriptMessageEnricher;
  };
  export type GetTranscriptionManager = (props: GetTranscriptionManagerProps) => TranscriptionManager;
  export const TranscriptionManager = defineCapability<GetTranscriptionManager>(
    `${TRANSCRIPTION_PLUGIN}/capability/transcription-manager`,
  );
}
