//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { AiContextService, AiConversation, type ContextBinding } from '@dxos/assistant';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { type Message } from '@dxos/types';

import { Agent } from './definitions';
import { Project } from '../../../types';

export default Agent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ project: projectRef, prompt, event }) {
        const project = yield* Database.load(projectRef);
        invariant(Obj.instanceOf(Project.Project, project));
        invariant(project.chat, 'Project has no chat.');

        const chatQueue = yield* project.chat.pipe(
          Database.load,
          Effect.flatMap((chat) => Database.load(chat.queue)),
        );
        invariant(chatQueue, 'Project chat queue not found.');
        const conversation = yield* acquireReleaseResource(
          () => new AiConversation({ queue: chatQueue as Queue<Message.Message | ContextBinding> }),
        );

        const iniativesInContext = conversation.context.getObjects().filter(Obj.instanceOf(Project.Project));
        if (iniativesInContext.length !== 1) {
          throw new Error('There should be exactly one project in context. Got: ' + iniativesInContext.length);
        }

        if (!prompt && !event) {
          throw new Error('Either prompt or event must be provided.');
        }

        let input = '';
        if (prompt) {
          input += `${prompt}\n\n`;
        }
        if (event) {
          input += `<event>\n${JSON.stringify(event, null, 2)}\n</event>\n\n`;
        }

        yield* conversation
          .createRequest({
            prompt: input,
          })
          .pipe(Effect.retry({ times: 2 }));
      },
      Effect.scoped,
      Effect.provide(AiService.model('@anthropic/claude-sonnet-4-5')),
    ),
  ),
);
