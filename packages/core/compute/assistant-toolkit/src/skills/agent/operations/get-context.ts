//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { HarnessContextError } from '../../../errors';
import { Agent, Chat } from '../../../types';
import { GetContext } from './definitions';

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const agents = yield* Harness.queryContext(Filter.type(Agent.Agent));
      const chats = yield* Harness.queryContext(Filter.type(Chat.Chat));

      if (agents.length === 0 && chats.length === 0) {
        return { id: '', name: '', instructions: 'No agent context.', checklist: 'No checklist found.' };
      }
      if (agents.length > 1) {
        return yield* Effect.fail(new HarnessContextError({ type: 'agent', count: agents.length }));
      }
      if (chats.length > 1) {
        return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
      }

      // Prefer the directly bound chat; fall back to the agent's companion chat when no chat is bound.
      const directChat = chats.length === 1 ? chats[0] : undefined;
      const chat = directChat ?? (agents.length > 0 ? yield* Agent.loadChat(agents[0]) : undefined);

      if (agents.length === 0) {
        invariant(chat, 'Expected a bound chat when no agent is in context.');
        return {
          id: chat.id,
          name: chat.name ?? '',
          instructions: 'No agent context.',
          checklist: yield* Chat.formatChecklist(chat),
        };
      }

      const agent = agents[0];

      return {
        id: agent.id,
        name: agent.name,
        instructions: yield* Agent.loadInstructions(agent).pipe(
          Effect.map((_) => _.text),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No instructions found.')),
        ),
        checklist: yield* chat ? Chat.formatChecklist(chat) : Effect.succeed('No checklist found.'),
      };
    }) as any,
  ),
  Operation.opaqueHandler,
);
