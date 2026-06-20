//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';

import { createInaudibleAudioStreamTrack } from '../calls/util/stub-media-streams';

export const useInaudibleAudioStreamTrack = () => {
  const [audioStreamTrack, setAudioStreamTrack] = useState<MediaStreamTrack | undefined>(undefined);
  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      const audioStreamTrack = await createInaudibleAudioStreamTrack({ ctx });
      setAudioStreamTrack(audioStreamTrack);
    });

    return () => {
      void ctx.dispose();
    };
  }, []);

  return audioStreamTrack;
};
