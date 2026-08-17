//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Transcriber } from '@dxos/pipeline-transcription';

import { type CreateTranscriberOptions, createTranscriber } from '../capture';

/**
 * Everything {@link createTranscriber} takes, optional except `endpoint`: an absent transcription
 * service is a caller-visible state, not a default this hook can invent.
 */
export type UseTranscriberOptions = Partial<Omit<CreateTranscriberOptions, 'endpoint'>> &
  Pick<CreateTranscriberOptions, 'endpoint'>;

/**
 * Records audio while the user is speaking and transcribes it after they pause. Builds a
 * {@link Transcriber} directly from {@link createTranscriber} (no app-framework capability needed,
 * since the browser construction lives in this package); returns `undefined` until a track and
 * `onSegments` handler are supplied.
 */
export const useTranscriber = ({
  audioStreamTrack,
  endpoint,
  recorderConfig,
  transcriberConfig,
  transcribe,
  onSegments,
}: UseTranscriberOptions): Transcriber | undefined => {
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!audioStreamTrack || !onSegments) {
      return undefined;
    }

    return createTranscriber({
      audioStreamTrack,
      endpoint,
      recorderConfig,
      transcriberConfig,
      transcribe,
      onSegments,
    });
  }, [audioStreamTrack, endpoint, recorderConfig, transcriberConfig, transcribe, onSegments]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
