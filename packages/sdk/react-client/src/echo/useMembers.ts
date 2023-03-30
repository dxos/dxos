//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { PublicKey, SpaceMember } from '@dxos/client';

import { useSpaces } from './useSpaces';
import { MulticastObservable } from '@dxos/async';
import { useMulticastObservable } from '@dxos/react-async';

const EMPTY_OBSERVABLE = new MulticastObservable(() => {}, undefined)

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  // TODO(dmaretskyi): useSpace hook for spaces that are not ready.
  const spaces = useSpaces({ all: true });
  const space = spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined;

  const members = useMulticastObservable(space?.members ?? EMPTY_OBSERVABLE) ?? [];

  return members;
};
