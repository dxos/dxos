//
// Copyright 2024 DXOS.org
//

import React, { type FC, createContext, useContext, useState, type PropsWithChildren } from 'react';

import { AudioStream } from './AudioStream';

const AudioTrackContext = createContext<Record<string, MediaStreamTrack>>({});

type PullAudioTracksProps = PropsWithChildren<{ audioTracks: string[] }>;

export const PullAudioTracks: FC<PullAudioTracksProps> = ({ audioTracks, children }) => {
  const [audioTrackMap, setAudioTrackMap] = useState<Record<string, MediaStreamTrack>>({});

  return (
    <AudioTrackContext.Provider value={audioTrackMap}>
      <AudioStream
        tracksToPull={audioTracks}
        onTrackAdded={(id, track) =>
          setAudioTrackMap((previous) => ({
            ...previous,
            [id]: track,
          }))
        }
        onTrackRemoved={(id) => {
          setAudioTrackMap((previous) => {
            const update = { ...previous };
            delete update[id];
            return update;
          });
        }}
      />
      {children}
    </AudioTrackContext.Provider>
  );
};

export const usePulledAudioTracks = () => useContext(AudioTrackContext);

export const usePulledAudioTrack = (track?: string) => {
  const tracks = usePulledAudioTracks();
  return track ? tracks[track] : undefined;
};
