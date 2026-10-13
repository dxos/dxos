//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { type SpaceId, URI } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';

import { meta } from '#meta';
import { AgentOperation, AgentPresence, AgentSpace } from '#types';

/** Every agent in the client's spaces; none while the graph cannot answer. */
const allAgents = (db: Database.Database): Effect.Effect<Agent.Agent[]> =>
  Effect.tryPromise(() =>
    db.graph.query(Query.select(Filter.type(Agent.Agent)).from('all-accessible-spaces')).run(),
  ).pipe(Effect.orElseSucceed((): Agent.Agent[] => []));

/**
 * The home agents, among `agents`, that the space can add: neither living there nor present there already. An agent
 * is here when it lives here or has a presence here; either names its home's brain.
 */
export const invitableAgents = (agents: readonly Agent.Agent[], spaceId: SpaceId): Agent.Agent[] => {
  const here = new Set(
    agents.filter((agent) => Obj.getDatabase(agent)?.spaceId === spaceId).map(AgentPresence.brainOf),
  );
  return agents.filter((agent) => AgentPresence.homeOf(agent) === undefined && !here.has(Obj.getURI(agent)));
};

/** The DIDs of the agents the client's identity administers; none without a client or an identity. */
const administeredDids: Effect.Effect<Set<string>, never, Capability.Service> = Effect.gen(function* () {
  const client = yield* Capability.getOption(ClientCapabilities.Client);
  const identityKey = Option.isSome(client) ? toPublicKey(client.value.halo.identity.get()?.identityKey) : undefined;
  return Option.isSome(client) && identityKey
    ? AgentSpace.administeredDids(client.value.spaces.get(), identityKey)
    : new Set<string>();
});

// Agents are added to a space from its members panel, as people are; until they are HALO identities, adding one
// creates its presence there (`InviteAgent`) rather than admitting it as a member. Only an agent's admins may add it
// elsewhere, so only the agents the member administers are offered; EDGE enforces it when the presence registers.
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.InviteeSource, {
      list: (space) =>
        Effect.gen(function* () {
          const translator = yield* Capability.getOption(AppCapabilities.Translator);
          const unnamed = Option.match(translator, {
            onNone: () => 'New agent',
            onSome: ({ t }) => t('new-agent.name', { ns: meta.profile.key }),
          });
          const administered = yield* administeredDids;
          return invitableAgents(yield* allAgents(space.db), space.id)
            .filter((agent) => agent.did !== undefined && administered.has(agent.did))
            .map((agent) => ({
              key: Obj.getURI(agent),
              label: agent.name || unnamed,
            }));
        }),
      add: (space, key) =>
        // Made on the space's database, whose resolver reaches the agent in its own space.
        Operation.invoke(
          AgentOperation.InviteAgent,
          { agent: space.db.makeRef<Agent.Agent>(URI.make(key)) },
          { spaceId: space.id },
        ).pipe(Effect.asVoid),
    }),
  ),
);
