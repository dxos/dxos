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

import { Project, Plan } from '../../../types';

export default defineFunction({
  key: 'dxos.org/function/project/qualifier',
  name: 'Project Qualifier',
  description:
    'Qualifier that determines if the event is relevant to the project. Puts the data into the input queue of the project.',
  inputSchema: Schema.Struct({
    project: Schema.suspend(() => Type.Ref(Project.Project)),
    event: TriggerEvent.TriggerEvent,
  }),
  outputSchema: Schema.Void,
  services: [],
  handler: Effect.fnUntraced(
    function* ({ data }) {
      const project = yield* Database.load(data.project);
      invariant(Obj.instanceOf(Project.Project, project));
      invariant(project.chat, 'Project has no chat.');

      const { id, name, queue } = project;
      if (!queue) {
        throw new Error('Project has no queue.');
      }

      const plan = yield* Database.load(project.plan);
      const spec = yield* Database.load(project.spec);

      const {
        value: { isRelevant },
      } = yield* LanguageModel.generateObject({
        schema: Schema.Struct({
          isRelevant: Schema.Boolean,
        }),
        prompt: Prompt.fromMessages([
          Prompt.systemMessage({
            content: trim`
              You are a qualifying agent that determines if the event is relevant to the project.
              Respond with true if the event is relevant to the project, false otherwise.
              If you are not sure, return true.
              The qualified events will be forwarded to the larger agent that will process them.
              <project id="${id}" name="${name}">
                <spec>
                ${spec.content}
                </spec>
                <plan>
                  ${Plan.formatPlan(plan)}
                </plan>
              </project>
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
