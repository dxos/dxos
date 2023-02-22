//
// Copyright 2020 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { PublicKey, SpaceMember } from '@dxos/client';

import { useSpace } from './useSpaces';

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  const space = useSpace(spaceKey);
  const result = useMemo(() => space?.queryMembers(), [space]);
  const members =
    useSyncExternalStore(
      (listener) => (result ? result.subscribe(listener) : () => {}),
      () => result?.value
    ) ?? [];

  return members;
};
