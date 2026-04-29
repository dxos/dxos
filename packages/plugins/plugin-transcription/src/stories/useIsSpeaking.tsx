//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { useEffect, useMemo, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { SpeakingMonitor } from '@dxos/plugin-thread';

export const useIsSpeaking = (track?: MediaStreamTrack) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingMonitor = useMemo(() => {
    if (!track) {
      return;
    }
    return new SpeakingMonitor(track);
  }, [track]);

  useEffect(() => {
    if (!speakingMonitor) {
      return;
    }

    const ctx = new Context();
    scheduleTask(ctx, async () => {
      speakingMonitor.speakingChanged.on(ctx, () => setIsSpeaking(speakingMonitor.isSpeaking));
      await speakingMonitor.open();
      ctx.onDispose(() => speakingMonitor.close());
    });

    return () => {
      void ctx.dispose();
    };
  }, [speakingMonitor]);

  return isSpeaking;
};
