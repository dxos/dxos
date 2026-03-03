//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useRef } from 'react';

export type AudioStreamProps = {
  tracks: MediaStreamTrack[];
};

export const AudioStream: FC<AudioStreamProps> = ({ tracks }) => {
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
      {tracks.map((track) => (
        <AudioTrack key={track.id} track={track} mediaStream={mediaStreamRef.current} resetSrcObject={resetSrcObject} />
      ))}
    </>
  );
};

type AudioTrackParams = {
  track: MediaStreamTrack;
  mediaStream: MediaStream;
  resetSrcObject: () => void;
};

const AudioTrack = ({ track, mediaStream, resetSrcObject }: AudioTrackParams) => {
  useEffect(() => {
    const currentTrack = track;
    mediaStream.addTrack(currentTrack);
    resetSrcObject();
    return () => {
      mediaStream.removeTrack(currentTrack);
      resetSrcObject();
    };
  }, [track, mediaStream]);

  return null;
};
