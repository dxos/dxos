//
// Copyright 2024 DXOS.org
//

import { type ReactElement, useMemo } from 'react';

import { usePulledAudioTrack } from './PullAudioTracks';
import { usePromise } from './hooks/usePromise';
import { useRoomContext } from './hooks/useRoomContext';
import type { TrackObject } from './types';

interface PullTracksProps {
  video?: string;
  audio?: string;
  children: (props: { videoTrack?: MediaStreamTrack; audioTrack?: MediaStreamTrack }) => ReactElement;
}

export const PullVideoTrack = ({ video, audio, children }: PullTracksProps) => {
  const { client } = useRoomContext()!;
  const audioTrack = usePulledAudioTrack(audio);

  const [sessionId, trackName] = video?.split('/') ?? [];
  const trackObject = useMemo(
    () =>
      sessionId && trackName
        ? ({
            trackName,
            sessionId,
            location: 'remote',
          } satisfies TrackObject)
        : undefined,
    [sessionId, trackName],
  );

  const pulledTrackPromise = useMemo(
    () => (trackObject ? client?.pullTrack(trackObject) : undefined),
    [client, trackObject],
  );

  const videoTrack = usePromise(pulledTrackPromise);
  return children({ videoTrack, audioTrack });
};
