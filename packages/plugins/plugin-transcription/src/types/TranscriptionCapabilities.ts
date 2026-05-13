//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import {
  type MediaStreamRecorderProps,
  type Transcriber as TranscriberType,
  type TranscriberProps,
  type TranscriptMessageEnricher,
  type TranscriptionManager as TranscriptionManagerType,
} from '../transcriber';

export type GetTranscriberProps = {
  audioStreamTrack: MediaStreamTrack;
  recorderConfig?: Partial<MediaStreamRecorderProps['config']>;
  transcriberConfig?: Partial<TranscriberProps['config']>;
  onSegments: TranscriberProps['onSegments'];
  transcribe?: TranscriberProps['transcribe'];
};

export type GetTranscriber = (props: GetTranscriberProps) => TranscriberType;

export type GetTranscriptionManagerProps = {
  messageEnricher?: TranscriptMessageEnricher;
};

export type GetTranscriptionManager = (props: GetTranscriptionManagerProps) => TranscriptionManagerType;

export const Transcriber = Capability.make<GetTranscriber>(`${meta.id}.capability.transcriber`);

export const TranscriptionManager = Capability.make<GetTranscriptionManager>(
  `${meta.id}.capability.transcription-manager`,
);
