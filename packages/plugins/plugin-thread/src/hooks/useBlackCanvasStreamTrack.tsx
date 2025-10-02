//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';

import { createBlackCanvasStreamTrack } from '../calls/util/stub-media-streams';

export const useBlackCanvasStreamTrack = () => {
  const [blackCanvasStreamTrack, setBlackCanvasStreamTrack] = useState<MediaStreamTrack | undefined>(undefined);
  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      const blackCanvasStreamTrack = await createBlackCanvasStreamTrack({ ctx, width: 720, height: 480 });
      setBlackCanvasStreamTrack(blackCanvasStreamTrack);
    });

    return () => {
      void ctx.dispose();
    };
  }, []);

  return blackCanvasStreamTrack;
};
