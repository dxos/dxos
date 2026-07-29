//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { getSession } from '@dxos/compute/AgentService';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { Agent, Chat, Plan } from '../../../types';
import { Relay } from './definitions';

/**
 * The relay pattern (plugin-projects PLAN.md phase C): one trigger per subscribed feed runs this
 * relay, which qualifies the event with a cheap model and, when relevant, forwards it onto the
 * chat's durable session (the process input queue) — multiplexing and filtering in one construct,
 * with no intermediate staging feed.
 */
const handler: Operation.WithHandler<typeof Relay> = Relay.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ chat: chatRef, event, prompt, qualify }) {
        if (!event && !prompt) {
          return yield* Effect.die(new Error('Relay requires an event or a prompt.'));
        }
        const chat = yield* Database.load(chatRef).pipe(
          Effect.catchTag('EntityNotFoundError', () => Effect.die(new Error('Unable to load relay chat.'))),
        );

        if (event && (qualify ?? true)) {
          // Fail open (matching the prompt's "if unsure, return true"): a malformed model reply
          // forwards the event rather than silently dropping it.
          const relevant = yield* qualifyEvent(chat, event).pipe(
            Effect.retry({ times: 1 }),
            Effect.catchAll((error) =>
              Effect.sync(() => {
                log.warn('relay qualification failed; forwarding event', { error });
                return true;
              }),
            ),
          );
          if (!relevant) {
            return;
          }
        }

        const feed = yield* Database.load(chat.feed).pipe(
          Effect.catchTag('EntityNotFoundError', () => Effect.die(new Error('Unable to load relay chat feed.'))),
        );
        // The durable session recovers steering from its spawn annotation; passing the ref here
        // keeps the reuse identity honest (a repointed ref respawns the process).
        const session = yield* getSession(feed, { instructions: chat.instructions });
        const content = prompt ?? JSON.stringify(event);
        yield* session.submitPrompt([{ _tag: 'text', text: content, disposition: 'synthetic' }]);
      },
      Effect.provide(AiService.model('com.anthropic.model.claude-sonnet-4-6.default')),
    ),
  ),
  Operation.opaqueHandler,
);

/** Cheap-model relevance check, ported from the retired Qualifier's prompt (chat-centric per phase B). */
const qualifyEvent = (chat: Chat.Chat, event: unknown) =>
  Effect.gen(function* () {
    const agent = yield* Agent.loadForChat(chat);
    const instructions = chat.instructions
      ? yield* Database.load(chat.instructions).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    const instructionsText = instructions
      ? yield* Database.load(instructions.text).pipe(
          Effect.map((doc) => doc.content),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('')),
        )
      : '';
    const planText = chat.plan
      ? yield* Database.load(chat.plan).pipe(
          Effect.map(Plan.formatPlan),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No plan found.')),
        )
      : 'No plan found.';

    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({
        schema: Schema.Struct({
          isRelevant: Schema.Boolean,
        }),
        prompt: Prompt.fromMessages([
          Prompt.systemMessage({
            content: trim`
              You are a qualifying agent that determines if the event is relevant to the agent.
              Respond with true if the event is relevant to the agent, false otherwise.
              If you are not sure, return true.
              The qualified events will be forwarded to the larger agent that will process them.
              <agent id="${agent ? Obj.getURI(agent) : 'unknown'}" name="${agent?.name ?? ''}">
                <instructions>
                ${instructionsText}
                </instructions>
                <plan>
                  ${planText}
                </plan>
              </agent>
            `,
          }),
          Prompt.userMessage({
            content: [
              Prompt.makePart('text', {
                text: trim`
                  <event>
                    ${JSON.stringify(event, null, 2)}
                  </event>
                `,
              }),
            ],
          }),
        ]),
      }),
    );

    return value.isRelevant;
  });

export default handler;
