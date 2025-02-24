//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useRef } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { useAsyncEffect } from '@dxos/react-ui';

import { type AudioRecorder, Transcriber, MediaStreamRecorder } from '../ai';
import { TranscriptBlock, type TranscriptionState, type TranscriptSegment } from '../types';

const PREFIXED_CHUNKS_AMOUNT = 5;
const RECORD_INTERVAL = 200;
const STOP_TRANSCRIPTION_TIMEOUT = 250;

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

  // Initialize audio transcription.
  const transcriber = useRef<Transcriber | null>();
  const firstRun = useRef(false);

  // Initialize transcription.
  useEffect(() => {
    if (!firstRun.current) {
      firstRun.current = true;
    }

    if (!transcriber.current) {
      transcriber.current = new Transcriber({ prefixedChunksAmount: PREFIXED_CHUNKS_AMOUNT });
    }

    return () => {
      void transcriber.current?.close();
      transcriber.current = null;
    };
  }, []);

  // Get queue.
  const queue = useQueue<TranscriptBlock>(
    edgeClient,
    transcription.objectDxn ? DXN.parse(transcription.objectDxn) : undefined,
  );

  // Handle transcription text.
  const handleSegments = useCallback(
    async (segments: TranscriptSegment[]) => {
      const block = createStatic(TranscriptBlock, {
        author: author || 'Unknown',
        segments,
      });
      queue?.append([block]);
    },
    [queue, author],
  );

  // Set the transcription callback.
  useEffect(() => {
    transcriber.current?.setOnTranscription(handleSegments);
  }, [handleSegments, transcriber.current]);

  // Initialize audio recorder.
  const recorder = useRef<AudioRecorder | null>(null);
  useEffect(() => {
    if (!recorder.current && audioStreamTrack && transcriber.current) {
      recorder.current = new MediaStreamRecorder({
        onChunk: (chunk) => transcriber.current?.onChunk(chunk),
        mediaStreamTrack: audioStreamTrack,
        interval: RECORD_INTERVAL,
      });
      const settings = audioStreamTrack.getSettings();
      transcriber.current.setWavConfig({
        sampleRate: settings.sampleRate,
        bitDepthCode: settings.sampleSize ? String(settings.sampleSize) : '16',
        channels: settings.channelCount,
      });
    }

    return () => {
      void recorder.current?.stop();
      recorder.current = null;
    };
  }, [audioStreamTrack, transcriber.current]);

  // if user is not speaking, stop transcription after 1 second. if speaking, start transcription.
  const stopTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!transcription.enabled) {
      return;
    }

    if (!isSpeaking) {
      stopTimeout.current = setTimeout(() => {
        log.info('stopping transcription');
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
  }, [isSpeaking, transcription.enabled]);

  // Turn transcription on and off.
  useAsyncEffect(async () => {
    if (transcription.enabled && transcriber.current && recorder.current) {
      await transcriber.current.open();
      await recorder.current.start();
    } else if (!transcription.enabled) {
      await recorder.current?.stop();
      await transcriber.current?.close();
    }
  }, [transcription.enabled, recorder.current, transcriber.current]);
};
