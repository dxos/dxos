//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import {
  type MediaStreamRecorderProps,
  type Transcriber as TranscriberType,
  type TranscriberProps,
  type TranscriptMessageEnricher,
  type TranscriptionManager as TranscriptionManagerType,
} from '../transcriber';
import * as Settings$ from './Settings'; // eslint-disable-line

export type TranscriberProviderProps = {
  audioStreamTrack: MediaStreamTrack;
  recorderConfig?: Partial<MediaStreamRecorderProps['config']>;
  transcriberConfig?: Partial<TranscriberProps['config']>;
  onSegments: TranscriberProps['onSegments'];
  transcribe?: TranscriberProps['transcribe'];
};

export type TranscriberProvider = (props: TranscriberProviderProps) => TranscriberType;

export type TranscriptionManagerProviderProps = {
  messageEnricher?: TranscriptMessageEnricher;
};

export type TranscriptionManagerProvider = (props: TranscriptionManagerProviderProps) => TranscriptionManagerType;

export const TranscriberProvider = Capability.make<TranscriberProvider>(`${meta.profile.key}.capability.transcriber`);

export const TranscriptionManagerProvider = Capability.make<TranscriptionManagerProvider>(
  `${meta.profile.key}.capability.transcription-manager`,
);

export const Settings = Capability.make<Atom.Writable<Settings$.Settings>>(`${meta.profile.key}.capability.settings`);

/**
 * The single active editor transcription session. `id` is the editor's attendable id (the key it
 * registered under in `MarkdownCapabilities.EditorViews`); `recording` gates audio capture. `null`
 * when no session is active.
 */
export type RecordingSession = { id: string; recording: boolean };

export const RecordingSession = Capability.make<Atom.Writable<RecordingSession | null>>(
  `${meta.profile.key}.capability.recording-session`,
);
