//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

import { AgentOperation, AgentPresence } from '#types';

import { makeAgent } from './create-agent.ts';
import { seedBrief } from './presence.ts';

/**
 * The agent's presence in the space this runs against, created on first invitation: its name, DID and
 * instructions, keyed to its home, with a first chat that starts with what it knows from its other spaces.
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

  const chat = yield* Agent.loadChat(presence);
  if (chat) {
    yield* seedBrief(presence, yield* Database.load(chat.feed));
  }
  yield* Database.flush();
  return { agent: presence, created: true };
});

const handler: Operation.WithHandler<typeof AgentOperation.InviteAgent> = AgentOperation.InviteAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const { agent, created } = yield* inviteAgent(yield* Database.load(agentRef));
      return { agent: Ref.make(agent), created };
    }),
  ),
);

export default handler;
