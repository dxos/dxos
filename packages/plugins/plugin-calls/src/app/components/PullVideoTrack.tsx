//
// Copyright 2024 DXOS.org
//

import { type ReactElement, useMemo } from 'react';
import { of, switchMap } from 'rxjs';

import { usePulledAudioTrack } from './PullAudioTracks';
import { useStateObservable, useSubscribedState } from '../hooks/rxjsHooks';
import { useRoomContext } from '../hooks/useRoomContext';
import type { TrackObject } from '../utils/callsTypes';

interface PullTracksProps {
  video?: string;
  audio?: string;
  children: (props: { videoTrack?: MediaStreamTrack; audioTrack?: MediaStreamTrack }) => ReactElement;
}

export const PullVideoTrack = ({ video, audio, children }: PullTracksProps) => {
  const { peer } = useRoomContext()!;
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

  const trackObject$ = useStateObservable(trackObject);
  const pulledTrack$ = useMemo(
    () => trackObject$.pipe(switchMap((track) => (track ? peer.pullTrack(of(track)) : of(undefined)))),
    [peer, trackObject$],
  );
  const videoTrack = useSubscribedState(pulledTrack$);
  return children({ videoTrack, audioTrack });
};
