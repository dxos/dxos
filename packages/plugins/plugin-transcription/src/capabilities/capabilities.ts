//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import {
  type TranscriberParams,
  type Transcriber,
  type TranscriptionManager,
  type TranscriptMessageEnricher,
} from '../transcriber';

export namespace TranscriptionCapabilities {
  export type GetTranscriberProps = {
    audioStreamTrack: MediaStreamTrack;
    onSegments: TranscriberParams['onSegments'];
    config?: TranscriberParams['config'];
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
