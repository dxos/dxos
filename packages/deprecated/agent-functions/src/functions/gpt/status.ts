//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';

// TODO(burdon): Create end-to-end abstraction.
export const createStatusNotifier = (space: Space, id: string) => {
  let start: number | undefined;
  return {
    start: () => {
      if (!start) {
        start = Date.now();
        void space.postMessage(`status/${id}`, {
          event: 'processing',
          ts: start,
        });
      }
    },

    stop: () => {
      if (start) {
        const now = Date.now();
        void space.postMessage(`status/${id}`, {
          event: 'done',
          ts: now,
          duration: now - start,
        });
        start = undefined;
      }
    },
  };
};
