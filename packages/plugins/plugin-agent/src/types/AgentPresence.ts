//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Agent from '@dxos/assistant/Agent';
import { Obj } from '@dxos/echo';
import { EID, type EntityId, type SpaceId } from '@dxos/keys';

/**
 * `Obj.Meta` key source of an agent's presence in a space other than its home: the `Agent` an invitation
 * created there. The key's id is the home agent's URI, so every presence of one agent names the same brain.
 */
export const HOME_SOURCE = 'org.dxos.agent/home';

/** The foreign key a presence of the agent at `home` (its URI) carries. */
export const homeKey = (home: string) => ({ source: HOME_SOURCE, id: home });

/** The URI of the home agent this agent is a presence of; `undefined` for an agent in its home space. */
export const homeOf = (agent: Agent.Agent): string | undefined =>
  Obj.getMeta(agent).keys.find((key) => key.source === HOME_SOURCE)?.id;

/** Where an agent is: its space and its id there. */
export type Location = { spaceId: SpaceId; agentId: EntityId };

/** The space and entity id an agent URI names, if it names both. */
export const locate = (uri: string): Location | undefined => {
  const eid = EID.tryParse(uri);
  const spaceId = eid && EID.getSpaceId(eid);
  const agentId = eid && EID.getEntityId(eid);
  return spaceId && agentId ? { spaceId, agentId } : undefined;
};

/**
 * Whether the agent, in `spaceId`, delivers what a watch with this `origin` wakes: the space the watch was set from
 * holds its goal and recipient, so it delivers there; a watch stored before watches recorded one is the home's.
 */
export const delivers = (agent: Agent.Agent, spaceId: SpaceId, origin: string | undefined): boolean => {
  const space = origin === undefined ? undefined : locate(origin)?.spaceId;
  return space === undefined ? homeOf(agent) === undefined : space === spaceId;
};

/**
 * The name `BrainService` keys the agent's brain by: its identity's DID, which every presence of it carries, so every
 * space it is in shares one brain. An agent without an identity keeps the brain named by its home agent's id.
 */
export const brainId = (agent: Agent.Agent): string => {
  if (agent.did) {
    return agent.did;
  }
  const home = homeOf(agent);
  return (home && locate(home)?.agentId) ?? agent.id;
};
