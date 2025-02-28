//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { useCallContext } from './useCallContext';
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

  const [pulledTrack, setPulledTrack] = useState<MediaStreamTrack>();
  useEffect(() => {
    if (!trackObject || !peer) {
      return;
    }

    scheduleMicroTask(new Context(), async () => {
      log.info('>>> pulling track', { trackObject });
      setPulledTrack(await peer.pullTrack(trackObject));
    });
  }, [peer, trackObject]);

  return pulledTrack;
};
