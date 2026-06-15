//
// Copyright 2023 DXOS.org
//

import { MulticastObservable } from '@dxos/async';
import { PublicKey, type PublicKeyLike } from '@dxos/client';
import { HaloSpaceMember, type SpaceMember } from '@dxos/client/echo';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useSpaces } from './useSpaces';

export const useMembers = (spaceKey: PublicKeyLike | undefined): SpaceMember[] => {
  // TODO(dmaretskyi): useSpace hook for spaces that are not ready.
  const spaces = useSpaces({ all: true });
  const space = spaceKey
    ? spaces.find((space) => (spaceKey instanceof PublicKey ? space.key.equals(spaceKey) : space.id === spaceKey))
    : undefined;

  // EMPTY_OBSERVABLE needs to be a stable reference to avoid re-subscribing on every render.
  const members = useMulticastObservable(space?.members ?? MulticastObservable.empty()) ?? [];
  return members.filter((member) => member.role !== HaloSpaceMember.Role.REMOVED);
};
