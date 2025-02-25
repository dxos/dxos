//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { useAsyncEffect } from '@dxos/react-ui';

import { MediaStreamRecorder, Transcriber } from '../ai';
import { TranscriptBlock, type TranscriptionState } from '../types';

const PREFIXED_CHUNKS_AMOUNT = 5;
const RECORD_INTERVAL = 200;
const STOP_TRANSCRIPTION_TIMEOUT = 250;

// TODO(burdon): Rewrite as class with well defined lifecycle and start/stop method.

export type UseTranscriptionProps = {
  transcription: TranscriptionState;
  author: string;
  audioStreamTrack?: MediaStreamTrack;
  isSpeaking: boolean;
};

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export const useTranscription = ({ transcription, author, audioStreamTrack, isSpeaking }: UseTranscriptionProps) => {
  const edgeClient = useEdgeClient();
  // Get queue.
  const queue = useQueue<TranscriptBlock>(
    edgeClient,
    transcription.objectDxn ? DXN.parse(transcription.objectDxn) : undefined,
  );

  // Initialize audio transcription.
  const transcriber = useRef<Transcriber | null>();
  useEffect(() => {
    if (queue && audioStreamTrack) {
      void transcriber.current?.close();

      const recorder = new MediaStreamRecorder({
        mediaStreamTrack: audioStreamTrack,
        interval: RECORD_INTERVAL,
      });
      transcriber.current = new Transcriber({
        recorder,
        onSegments: async (segments) => {
          log.info('onSegments', { segments });
          const block = createStatic(TranscriptBlock, { author: author || 'Unknown', segments });
          queue?.append([block]);
        },
        prefixedChunksAmount: PREFIXED_CHUNKS_AMOUNT,
      });
    }

    return () => {
      void transcriber.current?.close();
      transcriber.current = null;
    };
  }, [queue, audioStreamTrack]);

  // Turn transcription on and off.
  useAsyncEffect(async () => {
    if (transcription.enabled && transcriber.current) {
      await transcriber.current.open();
    } else if (!transcription.enabled) {
      await transcriber.current?.close();
    }
  }, [transcription.enabled, transcriber.current]);

  // if user is not speaking, stop transcription after STOP_TRANSCRIPTION_TIMEOUT. if speaking, start transcription.
  const stopTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!transcription.enabled) {
      return;
    }

    if (!isSpeaking) {
      stopTimeout.current = setTimeout(() => {
        log.info('stopping transcription', { transcriber });
        transcriber.current?.stopChunksRecording();
      }, STOP_TRANSCRIPTION_TIMEOUT);
    } else {
      log.info('starting transcription');
      transcriber.current?.startChunksRecording();
      if (stopTimeout.current) {
        clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
    }

    return () => {
      if (stopTimeout.current) {
        clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
    };
  }, [isSpeaking, transcription.enabled, transcriber.current]);
};
