//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

import { Plan, Project } from '../../../types';
import { Qualifier } from './definitions';

export default Qualifier.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ project: projectRef, event }) {
        const project = yield* Database.load(projectRef);
        invariant(Obj.instanceOf(Project.Project, project));
        invariant(project.chat, 'Project has no chat.');

        const { id, name, queue } = project;
        if (!queue) {
          throw new Error('Project has no queue.');
        }

        const plan = yield* Database.load(project.plan);
        const spec = yield* Database.load(project.spec);

        const { value } = yield* Effect.scoped(
          LanguageModel.generateObject({
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
                        ${JSON.stringify(event, null, 2)}
                      </event>
                    `,
                  }),
                ],
              }),
            ]),
          }),
        );

        const { isRelevant } = value as { isRelevant: boolean };

        if (isRelevant) {
          const queueTarget = yield* Database.load(queue);
          if ('queue' in event && event.item) {
            const obj = event.item;
            yield* Effect.promise(() => queueTarget.append([obj]));
          } else if ('subject' in event && Ref.isRef(event.subject)) {
            const obj = yield* Database.load(event.subject);
            yield* Effect.promise(() => queueTarget.append([obj]));
          } else {
            throw new Error('Invalid event.');
          }
        }
      },
      Effect.provide(AiService.model('@anthropic/claude-sonnet-4-5')),
    ),
  ),
);
