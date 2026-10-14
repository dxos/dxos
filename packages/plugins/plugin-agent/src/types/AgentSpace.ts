//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Obj } from '@dxos/echo';
import { IdentityDid, type PublicKey, type SpaceId } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import * as AgentPresence from './AgentPresence.ts';

/**
 * An agent's default space: the space its own identity owns, minted with that identity on EDGE and tagged
 * `AppSpace.AGENT_SPACE_TAG`. Its members are the agent's admins. Every membership carries the tag, and a client
 * opens every space its HALO holds a membership of, so the agents an identity administers are among its own spaces
 * and finding them needs nothing from EDGE.
 */
export type Space = {
  readonly id: SpaceId;
  readonly tags: readonly string[];
  readonly members: { get(): SpaceMember[] };
  /** Whether `properties` can be read. */
  readonly isOpen?: boolean;
  /**
   * EDGE names the space after the agent and keys it to the agent's URI (`AgentPresence.HOME_SOURCE`), so its admins
   * reach the agent through it even without its home space.
   */
  readonly properties?: Obj.Unknown & { readonly name?: string };
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

/** An agent `identityKey` administers, as its space records it. */
export type Summary = {
  /** The agent's own space. */
  spaceId: SpaceId;
  name?: string;
  did?: IdentityDid;
  identityKey?: PublicKey;
  /** The URI of the agent in its home space, which names its brain; absent until the space is open. */
  home?: string;
};

/** The agents `identityKey` administers, read from their spaces. */
export const administeredAgents = (spaces: readonly Space[], identityKey: PublicKey): Summary[] =>
  administeredBy(spaces, identityKey).map((space) => {
    const agent = agentOf(space)?.identity;
    const properties = space.isOpen ? space.properties : undefined;
    return {
      spaceId: space.id,
      name: properties?.name,
      did: IdentityDid.isValid(agent?.did) ? agent.did : undefined,
      identityKey: toPublicKey(agent?.identityKey),
      home: properties && Obj.getKeys(properties, AgentPresence.HOME_SOURCE).at(0)?.id,
    };
  });
