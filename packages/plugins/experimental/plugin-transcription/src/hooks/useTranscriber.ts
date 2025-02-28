//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';

import { MediaStreamRecorder, Transcriber } from '../transcriber';
import { TranscriptBlock, type TranscriptionState } from '../types';

// TODO(burdon): Move to config?

/**
 * Length of the chunk in ms.
 */
const RECORD_INTERVAL = 200;

/**
 * Timeout to stop transcription after user stops speaking.
 */
const STOP_TRANSCRIPTION_TIMEOUT = 250;

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
  author?: string;
  audioStreamTrack?: MediaStreamTrack;
  transcription: TranscriptionState;
  isSpeaking: boolean;
};

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
// TODO(burdon): Refactor; should return controller?
export const useTranscriber = ({ author, audioStreamTrack, transcription, isSpeaking }: UseTranscriberProps) => {
  // Get queue.
  const edgeClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(
    edgeClient,
    transcription.queueDxn ? DXN.parse(transcription.queueDxn) : undefined,
  );

  // Initialize audio transcription.
  const transcriber = useRef<Transcriber | null>();
  useEffect(() => {
    if (queue && audioStreamTrack) {
      void transcriber.current?.close();
      transcriber.current = new Transcriber({
        config: {
          transcribeAfterChunksAmount: TRANSCRIBE_AFTER_CHUNKS_AMOUNT,
          prefixBufferChunksAmount: PREFIXED_CHUNKS_AMOUNT,
        },
        recorder: new MediaStreamRecorder({
          mediaStreamTrack: audioStreamTrack,
          interval: RECORD_INTERVAL,
        }),
        onSegments: async (segments) => {
          const block = createStatic(TranscriptBlock, { author, segments });
          queue?.append([block]);
        },
      });
    }

    return () => {
      void transcriber.current?.close();
      transcriber.current = null;
    };
  }, [queue, audioStreamTrack]);

  // Turn transcription on and off.
  useEffect(() => {
    if (transcription.enabled && transcriber.current) {
      void transcriber.current.open();
    } else if (!transcription.enabled && transcriber.current) {
      void transcriber.current.close();
    }
  }, [transcription.enabled, transcriber.current]);

  // If user is not speaking, stop transcription after STOP_TRANSCRIPTION_TIMEOUT. if speaking, start transcription.
  const t = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    log('transcription', {
      enabled: transcription.enabled,
      transcriber: !!transcriber.current,
      isOpen: transcriber.current?.isOpen,
      isSpeaking,
    });

    if (!transcription.enabled) {
      return;
    }

    if (isSpeaking) {
      log.info('starting transcription');
      if (t.current) {
        clearTimeout(t.current);
        t.current = null;
      }

      transcriber.current?.startChunksRecording();
    } else {
      t.current = setTimeout(() => {
        log.info('stopping transcription', { transcriber });
        transcriber.current?.stopChunksRecording();
      }, STOP_TRANSCRIPTION_TIMEOUT);
    }

    return () => {
      if (t.current) {
        clearTimeout(t.current);
        t.current = null;
      }
    };
  }, [transcription.enabled, transcriber.current, transcriber.current?.isOpen, isSpeaking]);
};
