//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

// TODO(burdon): Generalize and factor out.
export const useStatus = (space?: Space, channel?: string) => {
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (!space || !channel) {
      return;
    }

    const unsubscribe = space.listen(`status/${channel}`, (status) => {
      const { event } = status.payload ?? {};
      setProcessing(event === 'processing');
    });

    const t = setInterval(() => {
      setProcessing((prev: any) => {
        if (typeof prev?.ts === 'number' && Date.now() - prev.ts > 30_000) {
          return undefined;
        } else {
          return prev;
        }
      });
    }, 1_000);

    return () => {
      unsubscribe();
      clearInterval(t);
    };
  }, [space, channel]);

  return processing;
};
