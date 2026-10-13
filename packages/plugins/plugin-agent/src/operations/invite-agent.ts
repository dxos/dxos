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
import { type SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { AgentOperation, AgentPresence } from '#types';

import { makeAgent } from './create-agent.ts';

/**
 * The agent's presence in the space this runs against, created on first invitation: its name, DID and
 * instructions, keyed to its home, whose brain it reads and writes (`AgentPresence.brainId`).
 */
export const inviteAgent = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const { db } = yield* Database.Service;
  const brain = AgentPresence.brainOf(agent);
  if (Obj.getDatabase(agent)?.spaceId === db.spaceId) {
    return { agent, created: false };
  }

  // Back home, an agent is itself; elsewhere, the presence an earlier invitation left.
  const home = AgentPresence.locate(brain);
  const [existing] =
    home?.spaceId === db.spaceId
      ? (yield* Database.query(Filter.id(home.agentId)).run).filter(Obj.instanceOf(Agent.Agent))
      : yield* Database.query(Filter.foreignKeys(Agent.Agent, [AgentPresence.homeKey(brain)])).run;
  if (existing) {
    return { agent: existing, created: false };
  }

  // The instructions are read where they live: the invited agent's own space.
  const source = Obj.getDatabase(agent);
  const instructions = source
    ? yield* Agent.loadInstructions(agent).pipe(
        Effect.map(({ text }) => (text.length > 0 ? text : undefined)),
        Effect.provideService(Database.Service, Database.makeService(source)),
        Effect.orElseSucceed(() => undefined),
      )
    : undefined;
  const presence = yield* makeAgent({
    name: agent.name ?? '',
    instructions,
    did: agent.did,
    keys: [AgentPresence.homeKey(brain)],
  });
  yield* Database.flush();
  return { agent: presence, created: true };
});

/** EDGE would not put the agent's brain in the space: the inviter is not its admin, or it has no identity there. */
export class InviteRefusedError extends BaseError.extend(
  'InviteRefusedError',
  "Only an agent's admins can add it to another space.",
) {}

/**
 * Puts the agent's brain in the space on EDGE, which answers only the agent's admins: a presence in a space its brain
 * does not serve reads and writes nothing of it, so an invitation EDGE refuses is not made at all.
 */
const registerSpace = Effect.fnUntraced(function* (agent: Agent.Agent, spaceId: SpaceId) {
  const home = AgentPresence.locate(AgentPresence.brainOf(agent));
  const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
  if (!home || Option.isNone(edge)) {
    return yield* Effect.fail(new InviteRefusedError());
  }
  yield* Effect.tryPromise({
    try: () =>
      edge.value.request(Context.default(), `/compute/brain/${home.agentId}/spaces`, {
        method: 'POST',
        body: { spaceId },
      }),
    catch: (cause) => new InviteRefusedError({ cause }),
  });
});

const handler: Operation.WithHandler<typeof AgentOperation.InviteAgent> = AgentOperation.InviteAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const target = yield* Database.load(agentRef);
      const { db } = yield* Database.Service;
      if (Obj.getDatabase(target)?.spaceId !== db.spaceId) {
        yield* registerSpace(target, db.spaceId);
      }
      const { agent, created } = yield* inviteAgent(target);
      return { agent: Ref.make(agent), created };
    }),
  ),
);

export default handler;
