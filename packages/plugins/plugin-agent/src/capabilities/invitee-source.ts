//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { type SpaceId, URI } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';

import { meta } from '#meta';
import { AgentCapabilities, AgentOperation, AgentPresence, AgentSpace } from '#types';

/** Every agent in the client's spaces; none while the graph cannot answer. */
const allAgents = (db: Database.Database): Effect.Effect<Agent.Agent[]> =>
  Effect.tryPromise(() =>
    db.graph.query(Query.select(Filter.type(Agent.Agent)).from('all-accessible-spaces')).run(),
  ).pipe(Effect.orElseSucceed((): Agent.Agent[] => []));

/** An agent a space can add: the URI of its home agent, which names its brain, and its name. */
export type Invitee = { home: string; name?: string };

/**
 * The agents, among those the member administers, that the space can add: not the agent the space belongs to, and
 * none living or present there already. An agent's own space records its home; for a space minted before EDGE
 * recorded it, the home agent with the agent's DID among `agents`, the ones the member can see, stands in.
 */
export const invitees = (
  administered: readonly AgentSpace.Summary[],
  agents: readonly Agent.Agent[],
  spaceId: SpaceId,
): Invitee[] => {
  const here = new Set(
    agents.filter((agent) => Obj.getDatabase(agent)?.spaceId === spaceId).map(AgentPresence.brainOf),
  );
  const homes = agents.filter((agent) => AgentPresence.homeOf(agent) === undefined);
  return administered.flatMap(({ spaceId: own, name, did, home }) => {
    const visible = did === undefined ? undefined : homes.find((agent) => agent.did === did);
    const uri = home ?? (visible && Obj.getURI(visible));
    return own !== spaceId && uri !== undefined && !here.has(uri) ? [{ home: uri, name: name ?? visible?.name }] : [];
  });
};

/** The agents the client's identity administers; none without a client or an identity. */
const administeredAgents: Effect.Effect<AgentSpace.Summary[], never, Capability.Service> = Effect.gen(function* () {
  const client = yield* Capability.getOption(ClientCapabilities.Client);
  const identityKey = Option.isSome(client) ? toPublicKey(client.value.halo.identity.get()?.identityKey) : undefined;
  return Option.isSome(client) && identityKey
    ? AgentSpace.administeredAgents(client.value.spaces.get(), identityKey)
    : [];
});

// Agents are added to a space from its members panel, as people are; adding one registers it with EDGE, admits its
// identity and creates its presence there (`InviteAgent`). Only an agent's admins may add it elsewhere, so only the
// agents the member administers are offered, found through their own spaces, which an admin is a member of even when
// the agent lives in someone else's space; EDGE enforces it when the presence registers.
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.InviteeSource, {
      list: (space) =>
        Effect.gen(function* () {
          // Only agents with identities can be added elsewhere, and only the plugin's setting creates them.
          const settings = Option.getOrUndefined(yield* Capabilities.getAtomValueOption(AgentCapabilities.Settings));
          if (!settings?.identities) {
            return [];
          }
          const translator = yield* Capability.getOption(AppCapabilities.Translator);
          const unnamed = Option.match(translator, {
            onNone: () => 'New agent',
            onSome: ({ t }) => t('new-agent.name', { ns: meta.profile.key }),
          });
          return invitees(yield* administeredAgents, yield* allAgents(space.db), space.id).map(({ home, name }) => ({
            key: home,
            label: name || unnamed,
          }));
        }),
      add: (space, key) =>
        // The key is the home agent's URI, which `InviteAgent` resolves to the agent or, out of reach, its space.
        Operation.invoke(
          AgentOperation.InviteAgent,
          { agent: space.db.makeRef<Agent.Agent>(URI.make(key)) },
          { spaceId: space.id },
        ).pipe(Effect.asVoid),
    }),
  ),
);
