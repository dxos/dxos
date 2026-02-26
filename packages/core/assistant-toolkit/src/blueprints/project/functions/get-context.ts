//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Project, Plan } from '../../../types';

export default defineFunction({
  key: 'dxos.org/function/project/get-context',
  name: 'Get Project Context',
  description: 'Get the context of an project.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    spec: Schema.String,
    plan: Schema.String,
    artifacts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.optional(Schema.String),
        dxn: Schema.optional(Schema.String),
      }),
    ),
  }),
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data: _data }) {
    const project = yield* Project.getFromChatContext;

    return {
      id: project.id,
      name: project.name,
      spec: yield* project.spec.pipe(Database.load).pipe(
        Effect.map((_) => _.content),
        Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('No spec found.')),
      ),
      plan: yield* project.plan?.pipe(Database.load).pipe(
        Effect.map(Plan.formatPlan),
        Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('No plan found.')),
      ) ?? Effect.succeed('No plan found.'),
      artifacts: yield* Effect.forEach(project.artifacts, (artifact) =>
        Effect.gen(function* () {
          return {
            name: artifact.name,
            type: yield* Database.load(artifact.data).pipe(
              Effect.map(Obj.getTypename),
              Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('Artifact not found.')),
            ),
            dxn: artifact.data.dxn.toString(),
          };
        }),
      ),
    };
  }, AiContextService.fixFunctionHandlerType),
});
