//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type EntityLookup as EntityLookupFn } from '@dxos/transcription-pipeline';

import { meta } from '#meta';

import {
  type MediaStreamRecorderProps,
  type TranscriberProps,
  type Transcriber as TranscriberType,
  type TranscriptionManager as TranscriptionManagerType,
  type TranscriptMessageEnricher,
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

/**
 * Resolves entity references for live-transcription enrichment. Backend-agnostic (full-text, vector,
 * a remote service, …) so the headless driver depends on the function, not the database.
 */
export type EntityLookup = EntityLookupFn;

export const EntityLookup = Capability.make<EntityLookupFn>(`${meta.profile.key}.capability.entity-lookup`);

/**
 * Live transcription lifecycle, published by the driver for observers (toolbar spinner, testbench):
 * `recording` (mic capturing) → `draining` (mic off, finishing the pipeline) → `idle`.
 */
export type PipelinePhase = 'idle' | 'recording' | 'draining';

export const PipelineStatus = Capability.make<Atom.Writable<{ phase: PipelinePhase }>>(
  `${meta.profile.key}.capability.pipeline-status`,
);
