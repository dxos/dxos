//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';

import { TranscriptionCapabilities } from './capabilities';
import { MediaStreamRecorder, Transcriber } from '../transcriber';

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

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export default () => {
  const getTranscriber: TranscriptionCapabilities.GetTranscriber = ({ audioStreamTrack, onSegments }) => {
    // Initialize audio transcription.
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
  };

  return contributes(TranscriptionCapabilities.Transcriber, getTranscriber);
};
