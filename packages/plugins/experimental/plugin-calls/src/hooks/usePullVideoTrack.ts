//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';
import { of, switchMap } from 'rxjs';

import { useCallContext } from './useCallContext';
import { useSubscribedState, useStateObservable } from './utils';
import { type TrackObject } from '../types';

export const usePulledVideoTrack = (video: string | undefined) => {
  const { peer } = useCallContext();

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

  return useSubscribedState(pulledTrack$);
};
