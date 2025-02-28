//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { MediaStreamRecorder, Transcriber, type TranscriberParams } from '../transcriber';

// TODO(burdon): Move to config?

/**
 * Length of the chunk in ms.
 */
const RECORD_INTERVAL = 200;

/**
 * Number of chunks to save before the user starts speaking.
 */
const PREFIXED_CHUNKS_AMOUNT = 10;

/**
 * Number of chunks to transcribe automatically after.
 * Combined should be mess than 25MB or whisper would fail.
 */
const TRANSCRIBE_AFTER_CHUNKS_AMOUNT = 50;

export type UseTranscriberProps = {
  audioStreamTrack?: MediaStreamTrack;
  onSegments?: TranscriberParams['onSegments'];
};

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export const useTranscriber = ({ audioStreamTrack, onSegments }: UseTranscriberProps) => {
  // Initialize audio transcription.
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!onSegments || !audioStreamTrack) {
      return undefined;
    }
    return new Transcriber({
      config: {
        transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
        prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
      },
      recorder: new MediaStreamRecorder({
        mediaStreamTrack: audioStreamTrack,
        interval: RECORD_INTERVAL,
      }),
      onSegments,
    });
  }, [audioStreamTrack, onSegments]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
