//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

export const AudioTrackContext = createContext<Record<string, MediaStreamTrack>>({});

export const usePulledAudioTracks = () => useContext(AudioTrackContext);

export const usePulledAudioTrack = (track?: string) => {
  const tracks = usePulledAudioTracks();
  return track ? tracks[track] : undefined;
};
