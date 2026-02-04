//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import * as Initiative from '../Initiative';

export default defineFunction({
  key: 'dxos.org/function/initiative/get-context',
  name: 'Get Initiative Context',
  description: 'Get the context of an initiative.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Struct({
    spec: Schema.String,
    plan: Schema.String,
    artifacts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.String,
        dxn: Schema.String,
      }),
    ),
  }),
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data }) {
    const { binder } = yield* AiContextService;

    const initiative = binder
      .getObjects()
      .filter((_) => Obj.instanceOf(Initiative.Initiative, _))
      .at(0);
    if (!initiative) {
      throw new Error('No initiative in context.');
    }

    return {
      spec: yield* initiative.spec.pipe(Database.Service.load).pipe(Effect.map((_) => _.content)),
      plan: yield* initiative.plan?.pipe(Database.Service.load).pipe(Effect.map((_) => _.content)) ?? 'No plan found.',
      artifacts: yield* Effect.forEach(initiative.artifacts, (artifact) =>
        Effect.gen(function* () {
          return {
            name: artifact.name,
            type: Obj.getTypename(yield* Database.Service.load(artifact.data)),
            dxn: artifact.data.dxn.toString(),
          };
        }),
      ),
    };
  }) as any, // TODO(dmaretskyi): Services don't align -- need to refactor how functions are defined.
});
