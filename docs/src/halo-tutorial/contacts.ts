//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';

import { Space } from '@dxos/halo';
import { type IdentityDid, type SpaceId } from '@dxos/keys';

import { spaces } from './spaces.ts';

export type Contact = {
  readonly did: IdentityDid;
  readonly name?: string;
  readonly online: boolean;
  /** The spaces you share with them, by name. */
  readonly spaces: readonly { id: SpaceId; name?: string }[];
};

type SpaceMembers = {
  readonly space: Space.Info;
  readonly members: readonly Space.Member[];
};

/** The members of each of `spaces`, now and after each change. */
const membersOf = (
  spaces: readonly Space.Info[],
): Stream.Stream<readonly SpaceMembers[], never, Space.Service> =>
  spaces.length === 0
    ? Stream.make([])
    : Stream.zipLatestAll(
        ...spaces.map((space) =>
          Space.members(space.id).pipe(
            Stream.map((members) => ({ space, members })),
          ),
        ),
      );

// #region contacts
/**
 * Everyone who shares a space with you except `me`, once each, with the
 * spaces you share, now and after each change to any space's members.
 */
export const contacts = (me: IdentityDid) =>
  spaces.pipe(
    Stream.switchMap(membersOf),
    Stream.map((bySpace) => {
      const byDid = new Map<IdentityDid, Contact>();
      for (const { space, members } of bySpace) {
        for (const member of members) {
          if (!member.did || member.did === me) {
            continue;
          }
          const contact = byDid.get(member.did);
          byDid.set(member.did, {
            did: member.did,
            name: member.displayName ?? contact?.name,
            online: member.online || (contact?.online ?? false),
            spaces: [
              ...(contact?.spaces ?? []),
              { id: space.id, name: space.name },
            ],
          });
        }
      }
      return [...byDid.values()];
    }),
  );
// #endregion

// #region remove
/** Removes `did` from the space `spaceId`. */
export const removeContact = (spaceId: SpaceId, did: IdentityDid) =>
  Space.removeMember(spaceId, did);
// #endregion
