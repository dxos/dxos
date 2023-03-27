//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { PublicKey, SpaceMember } from '@dxos/client';

import { useSpaces } from './useSpaces';

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  // TODO(dmaretskyi): useSpace hook for spaces that are not ready.
  const spaces = useSpaces({ all: true });
  const space = spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined;

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
