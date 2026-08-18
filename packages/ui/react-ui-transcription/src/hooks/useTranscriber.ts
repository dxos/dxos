//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Transcriber } from '@dxos/pipeline-transcription';

import { type CreateTranscriberOptions, createTranscriber } from '../capture';

/** As {@link CreateTranscriberOptions}, but the hook returns `undefined` until a track and handler exist. */
export type UseTranscriberOptions = Omit<CreateTranscriberOptions, 'audioStreamTrack' | 'onSegments'> &
  Partial<Pick<CreateTranscriberOptions, 'audioStreamTrack' | 'onSegments'>>;

/**
 * Records audio while the user is speaking and transcribes it after they pause. Builds a
 * {@link Transcriber} directly from {@link createTranscriber} (no app-framework capability needed,
 * since the browser construction lives in this package); returns `undefined` until a track and
 * `onSegments` handler are supplied.
 */
export const useTranscriber = ({
  audioStreamTrack,
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
      recorderConfig,
      transcriberConfig,
      transcribe,
      onSegments,
    });
  }, [audioStreamTrack, recorderConfig, transcriberConfig, transcribe, onSegments]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
