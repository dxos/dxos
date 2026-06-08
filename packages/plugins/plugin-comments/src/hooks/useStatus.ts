//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

const PROCESSING_TIMEOUT = 30_000;

// TODO(burdon): Generalize and factor out.
export const useStatus = (space?: Space, channel?: string) => {
  const [processing, setProcessing] = useState(false);
  // Timestamp of the last `processing` event; used to auto-clear stale status.
  const lastProcessingTs = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!space || !channel) {
      lastProcessingTs.current = undefined;
      setProcessing(false);
      return;
    }

    const unsubscribe = space.listen(`status/${channel}`, (status) => {
      const { event } = status.payload ?? {};
      const isProcessing = event === 'processing';
      setProcessing(isProcessing);
      lastProcessingTs.current = isProcessing ? Date.now() : undefined;
    });

    const timer = setInterval(() => {
      const ts = lastProcessingTs.current;
      if (typeof ts === 'number' && Date.now() - ts > PROCESSING_TIMEOUT) {
        lastProcessingTs.current = undefined;
        setProcessing(false);
      }
    }, 1_000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [space, channel]);

  return processing;
};
