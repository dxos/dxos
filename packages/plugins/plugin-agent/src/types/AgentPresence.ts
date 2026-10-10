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

/** The URI naming the agent's brain: its home agent's, the same for every presence of it. */
export const brainOf = (agent: Agent.Agent): string => homeOf(agent) ?? Obj.getURI(agent);

/** Where an agent is: its space and its id there. */
export type Location = { spaceId: SpaceId; agentId: EntityId };

/** The space and entity id an agent URI names, if it names both. */
export const locate = (uri: string): Location | undefined => {
  const eid = EID.tryParse(uri);
  const spaceId = eid && EID.getSpaceId(eid);
  const agentId = eid && EID.getEntityId(eid);
  return spaceId && agentId ? { spaceId, agentId } : undefined;
};
