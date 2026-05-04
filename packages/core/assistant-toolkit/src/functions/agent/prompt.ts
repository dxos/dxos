//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { PromptError } from '../../errors';
import * as Chat from '../../types/Chat';
import { AgentPrompt } from './definitions';

export default AgentPrompt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* (data) {
        log.info('processing input', { input: data.input });

        const input = yield* Ref.isRef(data.input)
          ? Database.load(data.input).pipe(Effect.map(Obj.toJSON))
          : Effect.succeed(data.input);

        let feed = undefined;
        if (data.chat) {
          const chat = yield* Database.load(data.chat);
          invariant(Obj.instanceOf(Chat.Chat, chat), 'Expected Chat object.');
          feed = yield* Database.load(chat.feed);
        }

        return yield* AgentService.runRoutine(data.prompt, {
          input,
          systemInstructions: data.systemInstructions,
          model: data.model,
          feed,
        }).pipe(
          // AgentService.layer() is provided inline because this handler may run
          // inside a child process where AgentService is not injected via ServiceResolver.
          Effect.provide(AgentService.layer()),
          Effect.mapError((err) => new PromptError(err.message, { description: err.context?.description as string })),
        );
      },
      Effect.scoped,
    ),
  ),
  Operation.opaqueHandler,
);
