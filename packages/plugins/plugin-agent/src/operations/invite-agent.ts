//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { type IdentityDid, type SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentOperation, AgentPresence, AgentSpace } from '#types';

import { admitAgent } from './admit-agent.ts';
import { makeAgent } from './create-agent.ts';

/** What an agent's presence starts from: the URI of its home agent, which names its brain, and what it is called. */
export type Invitee = {
  home: string;
  name: string;
  did?: IdentityDid;
  /** The home agent's instructions; a presence made without them gets the base instructions for its name. */
  instructions?: string;
};

/** The agent as an invitee: the home of its brain, and its name, DID and instructions, read in its own space. */
export const inviteeOf = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const source = Obj.getDatabase(agent);
  const instructions = source
    ? yield* Agent.loadInstructions(agent).pipe(
        Effect.map(({ text }) => (text.length > 0 ? text : undefined)),
        Effect.provideService(Database.Service, Database.makeService(source)),
        Effect.orElseSucceed(() => undefined),
      )
    : undefined;
  const invitee: Invitee = { home: AgentPresence.brainOf(agent), name: agent.name ?? '', did: agent.did, instructions };
  return invitee;
});

/** The agent in the space this runs against: itself where the space is its home, elsewhere a presence of it. */
const agentHere = Effect.fnUntraced(function* (home: string) {
  const { db } = yield* Database.Service;
  const location = AgentPresence.locate(home);
  const found =
    location?.spaceId === db.spaceId
      ? (yield* Database.query(Filter.id(location.agentId)).run).filter(Obj.instanceOf(Agent.Agent))
      : yield* Database.query(Filter.foreignKeys(Agent.Agent, [AgentPresence.homeKey(home)])).run;
  return found.at(0);
});

/**
 * The agent's presence in the space this runs against, created on first invitation: keyed to its home, whose brain it
 * reads and writes (`AgentPresence.brainId`).
 */
export const inviteAgent = Effect.fnUntraced(function* ({ home, name, did, instructions }: Invitee) {
  const existing = yield* agentHere(home);
  if (existing) {
    return { agent: existing, created: false };
  }

  const presence = yield* makeAgent({ name, instructions, did, keys: [AgentPresence.homeKey(home)] });
  yield* Database.flush();
  return { agent: presence, created: true };
});

/** EDGE would not put the agent's brain in the space: the inviter is not its admin, or it has no identity there. */
export class InviteRefusedError extends BaseError.extend(
  'InviteRefusedError',
  "Only an agent's admins can add it to another space.",
) {}

/**
 * The agent the ref names, as an invitee: read from the agent where the client reaches its space, otherwise from the
 * agent's own space, which its admins are members of and which records its home and name but not its instructions.
 */
const resolveInvitee = Effect.fnUntraced(function* (agentRef: Ref.Ref<Agent.Agent>) {
  const client = Option.getOrUndefined(yield* Capability.getOption(ClientCapabilities.Client));
  const spaces = client?.spaces.get() ?? [];
  const spaceId = AgentPresence.locate(agentRef.uri)?.spaceId;
  if (!client || spaces.some((space) => space.id === spaceId)) {
    return yield* inviteeOf(yield* Database.load(agentRef));
  }

  const identityKey = toPublicKey(client.halo.identity.get()?.identityKey);
  const recorded = identityKey
    ? AgentSpace.administeredAgents(spaces, identityKey).find(({ home }) => home === agentRef.uri)
    : undefined;
  if (!recorded) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  const invitee: Invitee = { home: agentRef.uri, name: recorded.name ?? '', did: recorded.did };
  return invitee;
});

/**
 * Puts the agent's brain in the space on EDGE, which answers only the agent's admins: a presence in a space its brain
 * does not serve reads and writes nothing of it, so an invitation EDGE refuses is not made at all.
 */
const registerSpace = Effect.fnUntraced(function* (home: string, spaceId: SpaceId) {
  const location = AgentPresence.locate(home);
  const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
  if (!location || Option.isNone(edge)) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  yield* Effect.tryPromise({
    try: () =>
      edge.value.request(Context.default(), `/compute/brain/${location.agentId}/spaces`, {
        method: 'POST',
        body: { spaceId },
      }),
    catch: (cause) => new InviteRefusedError({ cause }),
  });
});

/**
 * Admits the agent's identity to the space as a member, found by its DID in the agent's own space, which only its
 * admins are in. An agent without an identity, or a client without the space, has nothing to admit.
 */
const admitHere = Effect.fnUntraced(function* ({ did, name }: Invitee, spaceId: SpaceId) {
  const client = Option.getOrUndefined(yield* Capability.getOption(ClientCapabilities.Client));
  const space = client?.spaces.get(spaceId);
  const self = toPublicKey(client?.halo.identity.get()?.identityKey);
  if (!client || !space || !self || did === undefined) {
    return;
  }
  const identityKey = AgentSpace.administeredAgents(client.spaces.get(), self).find(
    (agent) => agent.did === did,
  )?.identityKey;
  if (identityKey) {
    yield* admitAgent(space, identityKey, name);
  }
});

const handler: Operation.WithHandler<typeof AgentOperation.InviteAgent> = AgentOperation.InviteAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const invitee = yield* resolveInvitee(agentRef);
      const { db } = yield* Database.Service;
      if (AgentPresence.locate(invitee.home)?.spaceId !== db.spaceId) {
        yield* registerSpace(invitee.home, db.spaceId);
      }
      yield* admitHere(invitee, db.spaceId);
      const { agent, created } = yield* inviteAgent(invitee);
      return { agent: Ref.make(agent), created };
    }),
  ),
);

export default handler;
