//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/**
 * An agent's default space: the space its own identity owns, minted with that identity on EDGE and tagged
 * `AppSpace.AGENT_SPACE_TAG`. Its members are the agent's admins. Every membership carries the tag, and a client
 * opens every space its HALO holds a membership of, so the agents an identity administers are among its own spaces
 * and finding them needs nothing from EDGE.
 */
export type Space = {
  readonly tags: readonly string[];
  readonly members: { get(): SpaceMember[] };
};

/** Whether the space is an agent's default space. */
export const isAgentSpace = (space: Pick<Space, 'tags'>): boolean => space.tags.includes(AppSpace.AGENT_SPACE_TAG);

/** The agent's own identity: the member that owns its space. */
export const agentOf = (space: Space): SpaceMember | undefined =>
  space.members.get().find((member) => member.role === SpaceMember_Role.OWNER);

/** The agent's admins: every current member of its space but the agent itself. */
export const admins = (space: Space): SpaceMember[] =>
  space.members
    .get()
    .filter((member) => member.role !== SpaceMember_Role.OWNER && member.role !== SpaceMember_Role.REMOVED);

/** The agent spaces among `spaces` that `identityKey` is a current member of: the agents it administers. */
export const administeredBy = <S extends Space>(spaces: readonly S[], identityKey: PublicKey): S[] =>
  spaces.filter(
    (space) =>
      isAgentSpace(space) &&
      admins(space).some((member) => toPublicKey(member.identity?.identityKey)?.equals(identityKey) ?? false),
  );
