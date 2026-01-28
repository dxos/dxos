import { AiContextService } from '@dxos/assistant';
import { Database, Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
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

    return {
      goal: {
        dxn: spec?.data.dxn,
        content: !spec ? 'No spec found.' : JSON.stringify(yield* Database.Service.load(spec.data)),
      },
      plan: {
        dxn: plan?.data.dxn,
        content: !plan ? 'No plan found.' : JSON.stringify(yield* Database.Service.load(plan.data)),
      },
      artifacts: initiative.artifacts.map((artifact) => ({
        name: artifact.name,
        dxn: artifact.data.dxn,
      })),
    };
  }) as any, // TODO(dmaretskyi): Services don't align -- need to refactor how functions are defined.
});
