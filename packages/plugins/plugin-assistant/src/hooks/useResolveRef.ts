//
// Copyright 2025 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Space } from '@dxos/client/echo';
import { type Ref } from '@dxos/echo';

// TODO(burdon): Factor out.
export const useResolvedRef = <T>(space: Space, ref: Ref.Ref<T>): T | undefined => {
  const { subscribe, getSnapshot } = useMemo(() => {
    const resolver = space.db.graph.createRefResolver({});
    let currentCallback: (() => void) | undefined = undefined;

    return {
      subscribe: (cb: () => void) => {
        currentCallback = cb;
        return () => {
          if (currentCallback === cb) {
            currentCallback = undefined;
          }
        };
      },
      getSnapshot: () =>
        resolver?.resolveSync(ref.dxn, true, () => {
          currentCallback?.();
        }) as T | undefined,
    };
  }, [space, ref.dxn.toString()]);

  return useSyncExternalStore<T | undefined>(subscribe, getSnapshot);
};
