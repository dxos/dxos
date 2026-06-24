//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { HarnessContextError } from '../../../errors';
import { Plan, Agent, Chat } from '../../../types';
import { GetContext } from './definitions';

const formatPlan = (chat: Chat.Chat) =>
  chat.plan
    ? chat.plan.pipe(Database.load).pipe(
        Effect.map(Plan.formatPlan),
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No plan found.')),
      )
    : Effect.succeed('No plan found.');

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const agents = yield* Harness.queryContext(Filter.type(Agent.Agent));
      const chats = yield* Harness.queryContext(Filter.type(Chat.Chat));

      if (agents.length === 0 && chats.length === 0) {
        return { id: '', name: '', instructions: 'No agent context.', plan: 'No plan found.', artifacts: [] };
      }
      if (agents.length > 1) {
        return yield* Effect.fail(new HarnessContextError({ type: 'agent', count: agents.length }));
      }
      if (chats.length > 1) {
        return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
      }

      // Prefer the directly bound chat; fall back to the agent's own chat ref when no chat is bound.
      const directChat = chats.length === 1 ? chats[0] : undefined;
      const chat =
        directChat ??
        (agents.length > 0 && agents[0].chat
          ? yield* agents[0].chat
              .pipe(Database.load)
              .pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)))
          : undefined);

      if (agents.length === 0) {
        invariant(chat, 'Expected a bound chat when no agent is in context.');
        return {
          id: chat.id,
          name: chat.name ?? '',
          instructions: 'No agent context.',
          plan: yield* formatPlan(chat),
          artifacts: [],
        };
      }

      const agent = agents[0];

      return {
        id: agent.id,
        name: agent.name,
        instructions: yield* agent.instructions.pipe(Database.load).pipe(
          Effect.map((_) => _.content),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No instructions found.')),
        ),
        plan: yield* chat ? formatPlan(chat) : Effect.succeed('No plan found.'),
        artifacts: yield* Effect.forEach(agent.artifacts, (artifact) =>
          Effect.gen(function* () {
            return {
              name: artifact.name,
              type: yield* Database.load(artifact.data).pipe(
                Effect.map(Obj.getTypename),
                Effect.catchTag('EntityNotFoundError', () => Effect.succeed('Artifact not found.')),
              ),
              dxn: artifact.data.uri,
            };
          }),
        ),
      };
    }) as any,
  ),
  Operation.opaqueHandler,
);
