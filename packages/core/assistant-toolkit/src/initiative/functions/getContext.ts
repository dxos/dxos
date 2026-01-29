//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Text } from '@dxos/schema';

import * as Initiative from '../Initiative';

export default defineFunction({
  key: 'dxos.org/function/initiative/get-context',
  name: 'Get Initiative Context',
  description: 'Get the context of an initiative.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Struct({
    spec: Schema.Struct({
      dxn: Schema.String,
      content: Schema.String,
    }),
    plan: Schema.Struct({
      dxn: Schema.String,
      content: Schema.String,
    }),
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

    const spec = initiative.artifacts.find((artifact) => artifact.name === Initiative.SPEC_ARTIFACT_NAME);
    const plan = initiative.artifacts.find((artifact) => artifact.name === Initiative.PLAN_ARTIFACT_NAME);
    const specObj = !spec ? undefined : yield* Database.Service.resolve(spec.data, Text.Text);
    const planObj = !plan ? undefined : yield* Database.Service.resolve(plan.data, Text.Text);

    return {
      spec: {
        dxn: spec?.data.dxn.toString(),
        content: specObj?.content ?? 'No spec found.',
      },
      plan: {
        dxn: plan?.data.dxn.toString(),
        content: planObj?.content ?? 'No plan found.',
      },
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
