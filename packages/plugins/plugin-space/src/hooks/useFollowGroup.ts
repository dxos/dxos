//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { useIdentity } from '@dxos/halo-react';

import { SpaceCapabilities } from '#types';

import { FOLLOW_HUE, type FollowGroup, getFollowGroup, getFollowGroupMembers } from '../util/presence.ts';

export type FollowState = {
  group: FollowGroup;
  /** The palette hue that marks the follow. */
  hue: string;
  /** Everyone in the follow but this session's identity. */
  members: ReadonlySet<string>;
};

/** The follow this session takes part in within the space; undefined when it is in none. */
export const useFollowGroup = (spaceId: string | undefined, now: number): FollowState | undefined => {
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const identityKey = identity?.identityKey;
  return useMemo(() => {
    if (!ephemeral || !identityKey || !spaceId) {
      return undefined;
    }
    const group = getFollowGroup({
      spaceId,
      identityKey,
      sessionId: ephemeral.sessionId,
      following: ephemeral.following,
      peerFollowing: ephemeral.peerFollowing,
      viewersByObject: ephemeral.viewersByObject,
      now,
    });
    return group && { group, hue: FOLLOW_HUE, members: getFollowGroupMembers(group, identityKey) };
  }, [ephemeral, identityKey, spaceId, now]);
};
