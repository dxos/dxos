//
// Copyright 2025 DXOS.org
//

import { type Transcriber, type TranscriberCallbacks } from '@dxos/pipeline-transcription';

import { type RealtimeKitTranscriberOptions, createRealtimeKitTranscriber } from './realtime-kit-transcriber.ts';

export type CreateTranscriberOptions = RealtimeKitTranscriberOptions & TranscriberCallbacks;

/**
 * Builds the live {@link Transcriber} for a track: RealtimeKit's streaming transcription in a one-person meeting.
 * Consumed directly via the {@link useTranscriber} hook.
 */
export const createTranscriber = ({ onSegments, onEnded, ...options }: CreateTranscriberOptions): Transcriber =>
  createRealtimeKitTranscriber(options)({ onSegments, onEnded });
