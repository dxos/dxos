//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { type ContentBlock } from '@dxos/types';

/**
 * A live speech-to-text session over one audio source.
 *
 * Segments reach the `onSegments` callback it was built with, final and in the order they were spoken.
 */
export interface Transcriber {
  /** Connects the session; no audio is sent until {@link start}. */
  open(): Promise<unknown>;
  /** Ends the session, dropping segments still pending. */
  close(): Promise<unknown>;
  /** Starts sending audio. */
  start(): void;
  /** Stops sending audio; segments for audio already sent still arrive. */
  stop(): void;
  /** Stops sending audio and resolves once the segments for audio already sent are delivered. */
  flush(): Promise<void>;
  /** Releases a pending {@link flush}, dropping the segments it was waiting for. */
  abort(): void;
}

export type TranscriberCallbacks = {
  /** Receives final segments in spoken order; the next batch waits for this one to settle. */
  onSegments: (segments: ContentBlock.Transcript[]) => Promise<void>;
};

/** Builds a {@link Transcriber} delivering to the given callbacks: the one seam a pipeline is wired through. */
export type CreateTranscriber = (callbacks: TranscriberCallbacks) => Transcriber;

/** Raised when no transcription service is configured, so a caller can tell it from a session that failed. */
export class TranscriptionNotConfiguredError extends BaseError.extend(
  'TranscriptionNotConfiguredError',
  'Live transcription is not configured (runtime.services.edge.url).',
) {}
