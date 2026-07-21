//
// Copyright 2025 DXOS.org
//

import { type TranscribeConfig, type TranscribeFn, Transcriber } from '@dxos/pipeline-transcription';
import { type ContentBlock } from '@dxos/types';

import { MediaStreamRecorder } from './media-stream-recorder';

// Recorder chunk interval (ms).
const RECORD_INTERVAL = 200;
// Chunks retained before the user starts speaking, to catch the onset of speech.
const PREFIXED_CHUNKS_AMOUNT = 10;
// Chunks transcribed automatically; combined should stay under ~25MB or Whisper fails.
const TRANSCRIBE_AFTER_CHUNKS_AMOUNT = 50;

export type CreateTranscriberOptions = {
  audioStreamTrack: MediaStreamTrack;
  onSegments: (segments: ContentBlock.Transcript[]) => Promise<void>;
  transcriberConfig?: Partial<TranscribeConfig>;
  recorderConfig?: { interval?: number };
  transcribe?: TranscribeFn;
};

/**
 * Builds a {@link Transcriber} backed by a browser {@link MediaStreamRecorder} for the given track —
 * the low-level audio→text construction, co-located with the recorder so it can be tested outside the
 * plugin. Consumed directly via the {@link useTranscriber} hook.
 */
export const createTranscriber = ({
  audioStreamTrack,
  onSegments,
  transcriberConfig,
  recorderConfig,
  transcribe,
}: CreateTranscriberOptions): Transcriber =>
  new Transcriber({
    config: {
      transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
      prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
      ...transcriberConfig,
    },
    recorder: new MediaStreamRecorder({
      mediaStreamTrack: audioStreamTrack,
      config: { interval: RECORD_INTERVAL, ...recorderConfig },
    }),
    onSegments,
    transcribe,
  });
