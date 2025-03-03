//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { scheduleTask, sleep } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';

import { useCallContext } from './useCallContext';
import { type TrackObject } from '../types';

export const usePulledVideoTrack = (video: string | undefined) => {
  const { peer } = useCallContext();

  const [sessionId, trackName] = video?.split('/') ?? [];
  const trackData = useMemo(
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
    if (!trackData || !peer) {
      return;
    }

    const ctx = new Context();
    scheduleTask(ctx, async () => {
      // TODO(mykola): Add retry logic. Delete delay.
      // Wait for the track to be available on CallsService.
      await cancelWithContext(ctx, sleep(500));
      const track = await peer.pullTrack({ trackData, ctx });
      setPulledTrack(track);
    });

    return () => {
      void ctx.dispose();
    };
  }, [trackData, peer?.session]);

  return pulledTrack;
};
