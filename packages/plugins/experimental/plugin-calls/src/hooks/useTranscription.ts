//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useRef } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeHttpClient } from '@dxos/react-edge-client';
import { useQueue } from '@dxos/react-edge-client';
import { useAsyncEffect } from '@dxos/react-ui';

import { type AudioRecorder, Transcriber, MediaStreamRecorder } from '../ai';
import { type Ai, type UserMedia } from '../hooks';
import { Block, type Segment, type UserState } from '../types';

const PREFIXED_CHUNKS_AMOUNT = 5;
const RECORD_INTERVAL = 200;
const STOP_TRANSCRIPTION_TIMEOUT = 250;

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export const useTranscription = ({
  edgeClient,
  userMedia,
  identity,
  isSpeaking,
  ai,
}: {
  edgeClient: EdgeHttpClient;
  userMedia: UserMedia;
  identity: UserState;
  isSpeaking: boolean;
  ai: Ai;
}) => {
  // Initialize audio transcription.
  const transcription = useRef<Transcriber | null>();
  const firstRun = useRef(false);

  // Initialize transcription.
  useEffect(() => {
    if (!firstRun.current) {
      firstRun.current = true;
    }

    if (!transcription.current) {
      transcription.current = new Transcriber({ prefixedChunksAmount: PREFIXED_CHUNKS_AMOUNT });
    }

    return () => {
      void transcription.current?.close();
      transcription.current = null;
    };
  }, []);

  // Get queue.
  const queue = useQueue<Block>(
    edgeClient,
    ai.transcription.objectDxn ? DXN.parse(ai.transcription.objectDxn) : undefined,
  );

  // Handle transcription text.
  const handleSegments = useCallback(
    async (segments: Segment[]) => {
      const block = createStatic(Block, {
        author: identity.name || 'Unknown',
        segments,
      });
      queue?.append([block]);
    },
    [queue, identity.name],
  );

  // Set the transcription callback.
  useEffect(() => {
    transcription.current?.setOnTranscription(handleSegments);
  }, [handleSegments, transcription.current]);

  // Initialize audio recorder.
  const recorder = useRef<AudioRecorder | null>(null);
  useEffect(() => {
    if (!recorder.current && userMedia.audioTrack && transcription.current) {
      recorder.current = new MediaStreamRecorder({
        onChunk: (chunk) => transcription.current?.onChunk(chunk),
        mediaStreamTrack: userMedia.audioTrack,
        interval: RECORD_INTERVAL,
      });
      const settings = userMedia.audioTrack.getSettings();
      transcription.current.setWavConfig({
        sampleRate: settings.sampleRate,
        bitDepthCode: settings.sampleSize ? String(settings.sampleSize) : '16',
        channels: settings.channelCount,
      });
    }

    return () => {
      void recorder.current?.stop();
      recorder.current = null;
    };
  }, [userMedia.audioTrack, transcription.current]);

  // if user is not speaking, stop transcription after 1 second. if speaking, start transcription.
  const stopTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!ai.transcription.enabled) {
      return;
    }

    if (!isSpeaking) {
      stopTimeout.current = setTimeout(() => {
        log.info('stopping transcription');
        transcription.current?.stopChunksRecording();
      }, STOP_TRANSCRIPTION_TIMEOUT);
    } else {
      log.info('starting transcription');
      transcription.current?.startChunksRecording();
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
  }, [isSpeaking, ai.transcription.enabled]);

  // Turn transcription on and off.
  useAsyncEffect(async () => {
    if (ai.transcription.enabled && transcription.current && recorder.current) {
      await transcription.current.open();
      await recorder.current.start();
    } else if (!ai.transcription.enabled) {
      await recorder.current?.stop();
      await transcription.current?.close();
    }
  }, [ai.transcription.enabled, recorder.current, transcription.current]);
};
