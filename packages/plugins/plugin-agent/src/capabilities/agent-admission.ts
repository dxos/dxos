//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import type * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { PublicKey, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentOperation, AgentPresence, AgentSpace } from '#types';

/** Every agent in the client's spaces; none while the graph cannot answer. */
const allAgents = (db: Database.Database): Effect.Effect<Agent.Agent[]> =>
  Effect.tryPromise(() =>
    db.graph.query(Query.select(Filter.type(Agent.Agent)).from('all-accessible-spaces')).run(),
  ).pipe(Effect.orElseSucceed((): Agent.Agent[] => []));

/** An agent a space can add: the URI of its home agent, which names its brain, and its name. */
export type Invitee = { home: string; name?: string };

/**
 * The agents among `administered` that the space can add: not the agent the space belongs to, and none living or
 * present there already. An agent's own space records its home; for a space minted before EDGE recorded it, the home
 * agent with the agent's DID among `agents`, the ones the member can see, stands in.
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

/** The agents among `administered` that `admitted` names and the space can add (see {@link invitees}). */
export const admittedInvitees = (
  administered: readonly AgentSpace.Summary[],
  admitted: readonly PublicKey[],
  agents: readonly Agent.Agent[],
  spaceId: SpaceId,
): Invitee[] =>
  invitees(
    administered.filter(({ identityKey }) => identityKey && admitted.some((key) => key.equals(identityKey))),
    agents,
    spaceId,
  );

/** Attempts after a failure: a space just created takes a moment to reach EDGE. */
const RETRIES = Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 3 }));

type AddMembersInvocation = {
  input: Operation.Definition.Input<typeof SpaceOperation.AddMembers>;
  output: Operation.Definition.Output<typeof SpaceOperation.AddMembers>;
};

const isAddMembers = <E extends { operation: Operation.Definition.Any }>(event: E): event is E & AddMembersInvocation =>
  event.operation.meta.key.toString() === SpaceOperation.AddMembers.meta.key.toString();

/**
 * Puts an agent to work in a space its admin adds it to. The members panel admits the agent's identity as it admits any
 * contact's (`SpaceOperation.AddMembers`); for each agent this client's identity administers among those admitted, this
 * then invokes `InviteAgent`, which registers the space with the agent's brain on EDGE and makes its presence there.
 * EDGE refuses anyone but the agent's admins, so an agent admitted by anyone else stays a silent member.
 * TODO(mykola): Consider having EDGE accept the agent's regular inbox invitation instead, checking who signed its
 *  admission, so no step of the admitting client's follows the admission.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;

    yield* Effect.forkScoped(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.filter(isAddMembers),
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            // The pubsub carries every operation's invocation untyped; these are `AddMembers`' own.
            const { space }: AddMembersInvocation['input'] = event.input;
            const { admitted: admittedKeys }: AddMembersInvocation['output'] = event.output;
            const self = toPublicKey(client.halo.identity.get()?.identityKey);
            const administered = self ? AgentSpace.administeredAgents(client.spaces.get(), self) : [];
            if (administered.length === 0 || admittedKeys.length === 0) {
              return;
            }
            const admitted = admittedKeys.map((key) => PublicKey.from(key));
            const agents = yield* allAgents(space.db);
            for (const { home } of admittedInvitees(administered, admitted, agents, space.id)) {
              yield* invoker
                .invoke(
                  AgentOperation.InviteAgent,
                  { agent: space.db.makeRef<Agent.Agent>(URI.make(home)) },
                  { spaceId: space.id },
                )
                .pipe(Effect.retry(RETRIES));
            }
          }).pipe(
            // The agent stays a member that does not answer there; the picker no longer offers it, since it is a member.
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.failCause(cause)
                : Effect.sync(() => log.warn('admitted agent not put to work', { cause: Cause.pretty(cause) })),
            ),
          ),
        ),
      ),
    );

    return [];
  }),
);
