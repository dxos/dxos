//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { IdentityDid, PublicKey, type SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeCallFailedError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentOperation, AgentPresence, AgentSpace } from '#types';

import { AdmitAgentError, admitAgent, isMember, mayAdmitAgent } from './admit-agent.ts';
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
export type AgentIdentity = { identityDid: IdentityDid; identityKey: PublicKey; label: string };

/** `GET /compute/brain/:agent`, as far as the invitation reads it. */
const BrainInfo = Schema.Struct({
  identity: Schema.Struct({ identityDid: IdentityDid, identityKey: Schema.String, label: Schema.String }),
});

/**
 * The identity of the agent whose home is `home`, from EDGE, which minted it: never from a space that claims to be the
 * agent's, since a client chooses its own space's tags and owner. `undefined` for an agent without one, which EDGE
 * answers with 404.
 */
const identityOf = Effect.fnUntraced(function* (home: string) {
  const location = AgentPresence.locate(home);
  const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
  if (!location || Option.isNone(edge)) {
    return undefined;
  }
  return yield* Effect.tryPromise({
    try: () => edge.value.request(Context.default(), `/compute/brain/${location.agentId}`, { method: 'GET' }),
    catch: (cause) => new InviteRefusedError({ cause }),
  }).pipe(
    Effect.flatMap((answer) =>
      Schema.decodeUnknownEffect(BrainInfo)(answer).pipe(Effect.mapError((cause) => new InviteRefusedError({ cause }))),
    ),
    Effect.flatMap(({ identity }) =>
      Effect.try({
        try: (): AgentIdentity => ({
          identityDid: identity.identityDid,
          identityKey: PublicKey.fromHex(identity.identityKey),
          label: identity.label,
        }),
        catch: (cause) => new InviteRefusedError({ cause }),
      }),
    ),
    Effect.catchIf(
      (error) => error.cause instanceof EdgeCallFailedError && error.cause.status === 404,
      () => Effect.succeed(undefined),
    ),
  );
});

/**
 * The agent the ref names, as an invitee, and the identity EDGE minted for it: read from the agent where the client
 * reaches its space, otherwise from the agent's own space, which its admins are members of and which records its home
 * and name but not its instructions. Either way the agent's DID is EDGE's, and its own space is read only where the
 * identity EDGE names owns it.
 */
const resolveInvitee = Effect.fnUntraced(function* (agentRef: Ref.Ref<Agent.Agent>) {
  const client = Option.getOrUndefined(yield* Capability.getOption(ClientCapabilities.Client));
  const spaces = client?.spaces.get() ?? [];
  const spaceId = AgentPresence.locate(agentRef.uri)?.spaceId;
  if (!client || spaces.some((space) => space.id === spaceId)) {
    const invitee = yield* inviteeOf(yield* Database.load(agentRef));
    const identity = yield* identityOf(invitee.home);
    return { invitee: { ...invitee, did: identity?.identityDid ?? invitee.did }, identity };
  }

  const identity = yield* identityOf(agentRef.uri);
  if (!identity) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  const self = toPublicKey(client.halo.identity.get()?.identityKey);
  const recorded = self
    ? AgentSpace.administeredAgents(spaces, self).find(
        ({ home, identityKey }) => home === agentRef.uri && (identityKey?.equals(identity.identityKey) ?? false),
      )
    : undefined;
  const invitee: Invitee = { home: agentRef.uri, name: recorded?.name ?? identity.label, did: identity.identityDid };
  return { invitee, identity };
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

/** The client's view of the space the invitation is into, and who the client is; none without a client. */
const memberSpace = Effect.fnUntraced(function* (spaceId: SpaceId) {
  const client = Option.getOrUndefined(yield* Capability.getOption(ClientCapabilities.Client));
  const space = client?.spaces.get(spaceId);
  const self = toPublicKey(client?.halo.identity.get()?.identityKey);
  return space && self ? { space, self } : undefined;
});

const handler: Operation.WithHandler<typeof AgentOperation.InviteAgent> = AgentOperation.InviteAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const { invitee, identity } = yield* resolveInvitee(agentRef);
      const { db } = yield* Database.Service;
      const here = yield* memberSpace(db.spaceId);
      const admits = identity !== undefined && here !== undefined && !isMember(here.space, identity.identityKey);
      // A member who may not admit the agent is refused before EDGE puts the brain in the space. Any later failure
      // fails the invitation, and adding the agent again repeats each step safely: EDGE records the space once, an
      // admission skips a current member, and the presence is made only where there is none.
      if (admits && !mayAdmitAgent(here.space, here.self)) {
        return yield* Effect.fail(new AdmitAgentError());
      }
      if (AgentPresence.locate(invitee.home)?.spaceId !== db.spaceId) {
        yield* registerSpace(invitee.home, db.spaceId);
      }
      if (admits) {
        yield* admitAgent(here.space, identity.identityKey, invitee.name);
      }
      const { agent, created } = yield* inviteAgent(invitee);
      return { agent: Ref.make(agent), created };
    }),
  ),
);

export default handler;
