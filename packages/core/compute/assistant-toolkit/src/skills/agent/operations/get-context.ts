//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness, HarnessContextError } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Filter } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { GetContext } from './definitions';

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const agents = yield* Harness.queryContext(Filter.type(Agent.Agent));
      // The process is bound to its chat, so the conversation's own chat is authoritative; the
      // agent's companion chat is the fallback for a host that has none (e.g. a bare session).
      const sessionChat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));

      if (agents.length === 0 && !sessionChat) {
        return { id: '', name: '', instructions: 'No agent context.', checklist: 'No checklist found.' };
      }
      if (agents.length > 1) {
        return yield* Effect.fail(new HarnessContextError({ type: 'agent', count: agents.length }));
      }

      const chat = sessionChat ?? (agents.length > 0 ? yield* Agent.loadChat(agents[0]) : undefined);

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
