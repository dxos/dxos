//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren, useState } from 'react';

import { AudioStream } from './AudioStream';
import { AudioTrackContext } from '../../hooks';

export type AudioTrackContextProviderProps = PropsWithChildren<{ audioTracks: string[] }>;

export const AudioTrackContextProvider: FC<AudioTrackContextProviderProps> = ({ audioTracks, children }) => {
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
