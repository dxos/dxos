//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

export type UseAudioState = {
  audio?: HTMLAudioElement;
  stream?: MediaStream;
  track?: MediaStreamTrack;
};

export const useAudioFile = (audioUrl: string, constraints?: MediaTrackConstraints): UseAudioState => {
  const [{ audio, stream, track }, setStream] = useState<UseAudioState>({});
  useEffect(() => {
    const ctx = new Context();

    scheduleTask(ctx, async () => {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      ctx.onDispose(() => {
        URL.revokeObjectURL(objectUrl);
      });

      const audio = new Audio();
      audio.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        audio.addEventListener(
          'error',
          (err) => {
            log.error('error', { err });
            reject(err);
          },
          { once: true },
        );
        audio.addEventListener(
          'canplay',
          async () => {
            log.info('starting...');
            try {
              // Try to play the audio
              await audio.play();
              resolve();
            } catch (playError) {
              log.error('Play failed', { playError });
              // Still resolve as the audio is ready, even if autoplay failed
              resolve();
            }
          },
          { once: true },
        );
        audio.load();
      });

      const audioCtx = new AudioContext();

      // Resume AudioContext if it's suspended
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const destination = audioCtx.createMediaStreamDestination();
      destination.channelCount = 1;

      const source = audioCtx.createMediaElementSource(audio);
      source.connect(destination);
      const track = destination.stream.getAudioTracks()[0];
      if (constraints) {
        await track.applyConstraints(constraints).catch((err) => log.catch(err));
      }
      // Also connect to speakers so audio is audible

      setStream({
        audio,
        stream: destination.stream,
        track: destination.stream.getAudioTracks()[0],
      });
    });

    return () => {
      void ctx.dispose();
    };
  }, [audioUrl]);

  return { audio, stream, track };
};
