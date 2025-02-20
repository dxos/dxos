//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { Filter, updateText, useQuery, type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type AudioRecorder, Transcription, type TranscribedText } from '../ai';
import { initializeMediaRecorder, MediaStreamRecorder } from '../ai/media-stream-recorder';
import { type Ai, type UserMedia } from '../hooks';
import { type UserState } from '../types';
import { getTimeStr } from '../utils';

/**
 * Sends last `recordingLength` seconds of audio to the server each `recordingInterval` milliseconds.
 */
// TODO(mykola): Make a hook.
export const useTranscription = ({
  space,
  userMedia,
  identity,
  isSpeaking,
  ai,
}: {
  space: Space;
  userMedia: UserMedia;
  identity: UserState;
  isSpeaking: boolean;
  ai: Ai;
}) => {
  const [enabledTranscription, setEnabledTranscription] = useState(false);
  const recorder = useRef<AudioRecorder | null>(null);
  const transcription = useRef<Transcription | null>();

  // Get document.
  const doc = useQuery(space, Filter.schema(DocumentType, { id: ai.transcription.objectId }))[0];
  useEffect(() => {
    if (doc) {
      doc.content.load().catch((err) => log.catch(err));
    }
  }, [doc]);

  // Handle transcription text.
  const handleTranscriptionText = useCallback(
    async (text: TranscribedText) => {
      const time = getTimeStr(text.timestamp);
      updateText(
        doc!.content.target!,
        ['content'],
        doc!.content.target!.content + `\n   _${time} ${identity!.name}_\n` + text.text,
      );
    },
    [doc],
  );

  // Initialize audio transcription.
  useAsyncEffect(async () => {
    if (!transcription.current) {
      await initializeMediaRecorder();
      transcription.current = new Transcription({ prefixedChunksAmount: 3 });
    }

    return () => {
      void transcription.current?.close();
      transcription.current = null;
    };
  }, []);

  // Set the transcription callback.
  useEffect(() => {
    transcription.current?.setOnTranscription(handleTranscriptionText);
  }, [handleTranscriptionText, transcription.current]);

  useEffect(() => {
    if (!recorder.current && userMedia.audioTrack && transcription.current) {
      recorder.current = new MediaStreamRecorder({
        onChunk: (chunk) => transcription.current!.onChunk(chunk),
        mediaStreamTrack: userMedia.audioTrack,
        interval: 3_00,
      });
      log.info('setting config', {
        settings: userMedia.audioTrack.getSettings(),
      });
      transcription.current!.setWavConfig({
        sampleRate: userMedia.audioTrack.getSettings().sampleRate!,
        bitDepthCode: userMedia.audioTrack.getSettings().sampleSize!.toString(),
        channels: userMedia.audioTrack.getSettings().channelCount,
      });
    }

    return () => {
      recorder.current?.stop();
      recorder.current = null;
    };
  }, [userMedia.audioTrack, transcription.current]);

  // if user is not speaking, stop transcription after 1 second. if speaking, start transcription.
  const stopTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!enabledTranscription) {
      return;
    }

    if (!isSpeaking) {
      stopTimeout.current = setTimeout(() => {
        log.info('stopping recorder');
        transcription.current?.stopChunksRecording();
      }, 1_000);
    } else {
      log.info('starting recorder');
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
  }, [isSpeaking, enabledTranscription]);

  useEffect(() => {
    log.info('useTranscription useEffect', { enabledTranscription });
    if (enabledTranscription) {
      void transcription.current?.open();
      void recorder.current?.start();
    } else {
      void recorder.current?.stop();
      transcription.current?.stopChunksRecording();
      void transcription.current?.close();
    }
  }, [enabledTranscription, recorder.current, transcription.current]);

  return {
    turnTranscriptionOn: () => setEnabledTranscription(true),
    turnTranscriptionOff: () => setEnabledTranscription(false),
  };
};
