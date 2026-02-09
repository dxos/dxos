//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { TriggerEvent, defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

import * as Initiative from '../Initiative';

export default defineFunction({
  key: 'dxos.org/function/initiative/qualifier',
  name: 'Initiative Qualifier',
  description:
    'Qualifier that determines if the event is relevant to the initiative. Puts the data into the input queue of the initiative.',
  inputSchema: Schema.Struct({
    initiative: Schema.suspend(() => Type.Ref(Initiative.Initiative)),
    event: TriggerEvent.TriggerEvent,
  }),
  outputSchema: Schema.Void,
  services: [],
  handler: Effect.fnUntraced(
    function* ({ data }) {
      const initiative = yield* Database.load(data.initiative);
      invariant(Obj.instanceOf(Initiative.Initiative, initiative));
      invariant(initiative.chat, 'Initiative has no chat.');

      const { id, name, plan, spec, queue } = initiative;
      if (!queue) {
        throw new Error('Initiative has no queue.');
      }

      const { content: planContent } = yield* Database.load(plan);
      const { content: specContent } = yield* Database.load(spec);

      const {
        value: { isRelevant },
      } = yield* LanguageModel.generateObject({
        schema: Schema.Struct({
          isRelevant: Schema.Boolean,
        }),
        prompt: Prompt.fromMessages([
          Prompt.systemMessage({
            content: trim`
              You are a qualifying agent that determines if the event is relevant to the initiative.
              Respond with true if the event is relevant to the initiative, false otherwise.
              If you are not sure, return true.
              The qualified events will be forwarded to the larger agent that will process them.
              <initiative>
                ${JSON.stringify(
                  {
                    id,
                    name,
                    plan: planContent,
                    spec: specContent,
                  },
                  null,
                  2,
                )}
              </initiative>
            `,
          }),
          Prompt.userMessage({
            content: [
              Prompt.makePart('text', {
                text: trim`
              <event>
                ${JSON.stringify(data.event, null, 2)}
              </event>
            `,
              }),
            ],
          }),
        ]),
      });

      if (isRelevant) {
        const queueTarget = yield* Database.load(queue);

        if ('queue' in data.event && data.event.item) {
          const obj = data.event.item;
          yield* Effect.promise(() => queueTarget.append([obj]));
        } else if ('subject' in data.event && Ref.isRef(data.event.subject)) {
          const obj = yield* Database.load(data.event.subject);
          yield* Effect.promise(() => queueTarget.append([obj]));
        } else {
          throw new Error('Invalid event.');
        }
      }
    },
    Effect.scoped,
    Effect.provide(AiService.model('@anthropic/claude-sonnet-4-5')),
  ),
});
