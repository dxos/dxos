//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { useSoundEffect } from '@dxos/react-ui-sfx';

import { type TranscriberProps } from '../transcriber';

import { useAudioTrack } from './useAudioTrack';
import { useTranscriber } from './useTranscriber';

export type UseVoiceInputProps = {
  active?: boolean;
  onUpdate: (text: string) => void;
};

/**
 * Hook for voice input.
 */
export const useVoiceInput = ({ active, onUpdate }: UseVoiceInputProps) => {
  const soundStart = useSoundEffect('StartRecording');
  const soundStop = useSoundEffect('StopRecording');

  const handleSegments = useCallback<TranscriberProps['onSegments']>(async (segments) => {
    const text = segments.map((str) => str.text.trim().replace(/[^\w\s]/g, '')).join(' ');
    onUpdate(text);
  }, []);

  // Audio/transcription.
  const [recording, setRecording] = useState(false);
  const track = useAudioTrack(active);
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
  });

  // Start/stop transcription.
  useEffect(() => {
    const ctx = new Context();
    scheduleMicroTask(ctx, async () => {
      if (active && transcriber) {
        await transcriber.open();
        log.info('starting...');
        setRecording(true);
        void soundStart.play();
        transcriber.startChunksRecording();
      } else if (!active && transcriber?.isOpen) {
        transcriber?.stopChunksRecording();
        await transcriber?.close();
        log.info('stopped');
        setRecording(false);
        void soundStop.play();
      }
    });

    return () => {
      void ctx.dispose();
    };
  }, [active, transcriber]);

  return { recording };
};
