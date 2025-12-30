//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { MediaStreamRecorder, Transcriber, TranscriptionManager } from '../../transcriber';
import { TranscriptionCapabilities } from '../../types';

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
export default Capability.makeModule((context) =>
  Effect.sync(() => {
    const getTranscriber: TranscriptionCapabilities.GetTranscriber = ({
      audioStreamTrack,
      onSegments,
      transcriberConfig,
      recorderConfig,
    }) => {
      // Initialize audio transcription.
      return new Transcriber({
        config: {
          transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
          prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
          ...transcriberConfig,
        },
        recorder: new MediaStreamRecorder({
          mediaStreamTrack: audioStreamTrack,
          config: {
            interval: RECORD_INTERVAL,
            ...recorderConfig,
          },
        }),
        onSegments,
      });
    };

    const getTranscriptionManager: TranscriptionCapabilities.GetTranscriptionManager = ({ messageEnricher }) => {
      const client = context.getCapability(ClientCapabilities.Client);
      const transcriptionManager = new TranscriptionManager({
        edgeClient: client.edge,
        messageEnricher,
      });

      const identity = client.halo.identity.get();
      if (identity) {
        transcriptionManager.setIdentityDid(identity.did);
      }

      return transcriptionManager;
    };

    return [
      Capability.contributes(TranscriptionCapabilities.Transcriber, getTranscriber),
      Capability.contributes(TranscriptionCapabilities.TranscriptionManager, getTranscriptionManager),
    ];
  }),
);
