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
import { IdentityDid, type SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeCallFailedError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentOperation, AgentPresence, AgentSpace } from '#types';

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

/** The identity EDGE minted for an agent's brain. */
type AgentIdentity = { identityDid: IdentityDid; label: string };

/**
 * The identity EDGE minted for the agent with this DID, which EDGE answers only to the agent's admins and contacts:
 * never taken from a space that claims to be the agent's, since a client chooses its own space's tags and owner.
 * `undefined` for an agent without one, which EDGE answers with 404.
 */
const identityOf = Effect.fnUntraced(function* (did: IdentityDid | undefined) {
  const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
  if (!did || Option.isNone(edge)) {
    return undefined;
  }
  return yield* Effect.tryPromise({
    try: () => edge.value.getBrain(Context.default(), did),
    catch: (cause) => new InviteRefusedError({ cause }),
  }).pipe(
    Effect.catchIf(
      (error) => error.cause instanceof EdgeCallFailedError && error.cause.status === 404,
      () => Effect.succeed(undefined),
    ),
    // EDGE's answer must name the identity asked for, so a forged DID resolves to nothing.
    Effect.map((info): AgentIdentity | undefined =>
      info?.identity.identityDid === did ? { identityDid: did, label: info.identity.label } : undefined,
    ),
  );
});

/**
 * The agent the ref names, read where the client reaches its space, otherwise from the agent's own space (its home and
 * name, not its instructions); either way with the DID EDGE confirms.
 */
const resolveInvitee = Effect.fnUntraced(function* (agentRef: Ref.Ref<Agent.Agent>) {
  const client = Option.getOrUndefined(yield* Capability.getOption(ClientCapabilities.Client));
  const spaces = client?.spaces.get() ?? [];
  const spaceId = AgentPresence.locate(agentRef.uri)?.spaceId;
  if (!client || spaces.some((space) => space.id === spaceId)) {
    const invitee = yield* inviteeOf(yield* Database.load(agentRef));
    const identity = yield* identityOf(invitee.did);
    return { ...invitee, did: identity?.identityDid ?? invitee.did };
  }

  const self = toPublicKey(client.halo.identity.get()?.identityKey);
  const recorded = self
    ? AgentSpace.administeredAgents(spaces, self).find(({ home }) => home === agentRef.uri)
    : undefined;
  const identity = yield* identityOf(recorded?.did);
  if (!identity) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  const invitee: Invitee = { home: agentRef.uri, name: recorded?.name ?? identity.label, did: identity.identityDid };
  return invitee;
});

/**
 * Puts the agent's brain in the space on EDGE, which answers only the agent's admins: a presence in a space its brain
 * does not serve reads and writes nothing of it, so an invitation EDGE refuses is not made at all.
 */
const registerSpace = Effect.fnUntraced(function* (did: IdentityDid | undefined, spaceId: SpaceId) {
  const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
  if (!did || Option.isNone(edge)) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  yield* Effect.tryPromise({
    try: () => edge.value.addBrainSpace(Context.default(), did, spaceId),
    catch: (cause) => new InviteRefusedError({ cause }),
  });
});

const handler: Operation.WithHandler<typeof AgentOperation.InviteAgent> = AgentOperation.InviteAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const invitee = yield* resolveInvitee(agentRef);
      const { db } = yield* Database.Service;
      // Both steps are idempotent, so adding the agent again after a failure completes the invitation.
      if (AgentPresence.locate(invitee.home)?.spaceId !== db.spaceId) {
        yield* registerSpace(invitee.did, db.spaceId);
      }
      const { agent, created } = yield* inviteAgent(invitee);
      return { agent: Ref.make(agent), created };
    }),
  ),
);

export default handler;
