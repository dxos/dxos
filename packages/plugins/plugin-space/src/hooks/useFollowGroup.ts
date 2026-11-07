//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { SpaceId } from '@dxos/keys';
import { hexToHue } from '@dxos/util';

import { SpaceCapabilities } from '#types';

import { type FollowGroup, getFollowGroup, getFollowGroupMembers } from '../util/presence.ts';

export type FollowState = {
  group: FollowGroup;
  /** The leader's palette hue, which marks the whole follow on every screen in it. */
  hue: string;
  /** Everyone in the follow but this session's identity. */
  members: ReadonlySet<string>;
};

/** The follow this session takes part in within the space, with the leader's hue; undefined when it is in none. */
export const useFollowGroup = (spaceId: string | undefined, now: number): FollowState | undefined => {
  const ephemeral = Hooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const identity = useIdentity();
  const spaceMembers = useMembers(spaceId && SpaceId.isValid(spaceId) ? spaceId : undefined);
  return useMemo(() => {
    const identityKey = identity?.identityKey;
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
    if (!group) {
      return undefined;
    }
    const leaderData = group.leading
      ? identity.data
      : spaceMembers.find((member) => member.identityKey === group.leader)?.data;
    const hue = typeof leaderData?.hue === 'string' && leaderData.hue ? leaderData.hue : hexToHue(group.leader);
    return { group, hue, members: getFollowGroupMembers(group, identityKey) };
  }, [ephemeral, identity, spaceMembers, spaceId, now]);
};
