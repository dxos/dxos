//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef } from 'react';

import { scheduleTask, sleep } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';

import { useCallContext } from '../../hooks';

export type AudioStreamProps = {
  tracksToPull: string[];
  onTrackAdded: (id: string, track: MediaStreamTrack) => void;
  onTrackRemoved: (id: string, track: MediaStreamTrack) => void;
};

export const AudioStream: FC<AudioStreamProps> = ({ tracksToPull, onTrackAdded, onTrackRemoved }) => {
  const mediaStreamRef = useRef(new MediaStream());
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    const mediaStream = mediaStreamRef.current;
    audio.srcObject = mediaStream;
  }, []);

  const resetSrcObject = () => {
    const audio = ref.current;
    const mediaStream = mediaStreamRef.current;
    if (!audio || !mediaStream) {
      return;
    }
    // Need to set srcObject again in Chrome and call play() again for Safari
    // https://www.youtube.com/live/Tkx3OGrwVk8?si=K--P_AzNnAGrjraV&t=2533
    // Calling play() this way to make Chrome happy otherwise it throws an error.
    audio.addEventListener('canplay', () => audio.play(), { once: true });
    audio.srcObject = mediaStream;
  };

  return (
    <>
      <audio ref={ref} autoPlay />
      {tracksToPull.map((track) => (
        <AudioTrack
          key={track}
          track={track}
          mediaStream={mediaStreamRef.current}
          onTrackAdded={(metadata, track) => {
            onTrackAdded(metadata, track);
            resetSrcObject();
          }}
          onTrackRemoved={(metadata, track) => {
            onTrackRemoved(metadata, track);
            resetSrcObject();
          }}
        />
      ))}
    </>
  );
};

type AudioTrackProps = {
  track: string;
  mediaStream: MediaStream;
} & Pick<AudioStreamProps, 'onTrackAdded' | 'onTrackRemoved'>;

const AudioTrack = ({ track, mediaStream, onTrackAdded, onTrackRemoved }: AudioTrackProps) => {
  const onTrackAddedRef = useRef(onTrackAdded);
  onTrackAddedRef.current = onTrackAdded;
  const onTrackRemovedRef = useRef(onTrackRemoved);
  onTrackRemovedRef.current = onTrackRemoved;

  const { peer } = useCallContext();
  const trackObject = useMemo(() => {
    const [sessionId, trackName] = track.split('/');
    return {
      sessionId,
      trackName,
      location: 'remote',
    } as const;
  }, [track]);

  const audioTrack = useRef<MediaStreamTrack>();
  useEffect(() => {
    if (!trackObject) {
      return;
    }

    const ctx = new Context();
    scheduleTask(ctx, async () => {
      // Wait for the track to be available.
      await cancelWithContext(ctx, sleep(500));
      audioTrack.current = await peer?.pullTrack(trackObject);
    });

    return () => {
      void ctx.dispose();
    };
  }, [trackObject, peer?.session]);

  useEffect(() => {
    if (!audioTrack.current) {
      return;
    }
    const currentAudioTrack = audioTrack.current;

    mediaStream.addTrack(currentAudioTrack);
    onTrackAddedRef.current(track, currentAudioTrack);
    return () => {
      mediaStream.removeTrack(currentAudioTrack);
      onTrackRemovedRef.current(track, currentAudioTrack);
    };
  }, [audioTrack.current, mediaStream, track]);

  return null;
};
