//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { PublicKey, SpaceMember } from '@dxos/client';

import { useSpace } from './useSpaces';

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  const space = useSpace(spaceKey);
  const members =
    useSyncExternalStore(
      (listener) => {
        if (!space) {
          return () => {};
        }

        const subscription = space.members.subscribe(listener);
        return () => subscription.unsubscribe();
      },
      () => space?.members.get()
    ) ?? [];

  return members;
};
