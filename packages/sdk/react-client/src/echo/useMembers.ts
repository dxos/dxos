//
// Copyright 2023 DXOS.org
//

import { MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/client';
import { HaloSpaceMember, type SpaceMember } from '@dxos/client/echo';
import { useMulticastObservable } from '@dxos/react-async';

import { useSpaces } from './useSpaces';

export const useMembers = (spaceKey: PublicKey | undefined): SpaceMember[] => {
  // TODO(dmaretskyi): useSpace hook for spaces that are not ready.
  const spaces = useSpaces({ all: true });
  const space = spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined;

  // EMPTY_OBSERVABLE needs to be a stable reference to avoid re-subscribing on every render.
  const members = useMulticastObservable(space?.members ?? MulticastObservable.empty()) ?? [];
  return members.filter((member) => member.role !== HaloSpaceMember.Role.REMOVED);
};
