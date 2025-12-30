//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import {
  type MediaStreamRecorderProps,
  type Transcriber,
  type TranscriberProps,
  type TranscriptMessageEnricher,
  type TranscriptionManager,
} from '../transcriber';

export namespace TranscriptionCapabilities {
  export type GetTranscriberProps = {
    audioStreamTrack: MediaStreamTrack;
    recorderConfig?: Partial<MediaStreamRecorderProps['config']>;
    transcriberConfig?: Partial<TranscriberProps['config']>;
    onSegments: TranscriberProps['onSegments'];
  };
  export type GetTranscriber = (props: GetTranscriberProps) => Transcriber;
  export const Transcriber = Capability.make<GetTranscriber>(`${meta.id}/capability/transcriber`);

  export type GetTranscriptionManagerProps = {
    messageEnricher?: TranscriptMessageEnricher;
  };
  export type GetTranscriptionManager = (props: GetTranscriptionManagerProps) => TranscriptionManager;
  export const TranscriptionManager = Capability.make<GetTranscriptionManager>(
    `${meta.id}/capability/transcription-manager`,
  );
}
