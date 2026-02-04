//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextBinder, type ContextBinding } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Text } from '@dxos/schema';
import type { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { agent, getContext, update } from './functions';
import { Initiative, PLAN_ARTIFACT_NAME, SPEC_ARTIFACT_NAME } from './InitiativeSchema';

export { Initiative, PLAN_ARTIFACT_NAME, SPEC_ARTIFACT_NAME } from './InitiativeSchema';
export type { Initiative as InitiativeType } from './InitiativeSchema';

export const make = (
  props: Omit<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Initiative>, 'artifacts'>> & {
      spec: string;
      plan?: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
): Effect.Effect<Initiative, never, QueueService | Database.Service> =>
  Effect.gen(function* () {
    const initiative = Obj.make(Initiative, {
      ...props,
      artifacts: [
        {
          name: SPEC_ARTIFACT_NAME,
          data: Ref.make(Text.make(props.spec)),
        },
        {
          name: PLAN_ARTIFACT_NAME,
          data: Ref.make(Text.make(props.plan ?? '')),
        },
        ...(props.artifacts ?? []),
      ],
    });
    yield* Database.add(initiative);
    const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
    const contextBinder = new AiContextBinder({ queue });
    const initiativeBlueprint = yield* Database.add(Obj.clone(InitiativeBlueprint, { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(initiativeBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(initiative), ...(props.contextObjects ?? [])],
      }),
    );
    Obj.change(initiative, (initiative) => {
      initiative.chat = Ref.fromDXN(queue.dxn);
    });

    return initiative;
  });

export const functions = [getContext, update, agent];

export const InitiativeBlueprint = Blueprint.make({
  key: 'dxos.org/blueprint/initiative',
  name: 'Initiative blueprint',
  instructions: Template.make({
    source: trim`
      You work on an initiative. Each initiative has a spec - the goal of the initiative.
      The initiative plan shows the current progress of the initiative.
      Initiative has an number of associated artifacts you can read/write.
      Spec and plan are also artifacts.
      You can edit them if necessary.
      
      {{#with initiative}}
        Initiative spec:
          {{spec.dxn}}
          {{spec.content}}

        Initiative plan:
          {{plan.dxn}}
          {{plan.content}}

        All artifacts:
        {{#each artifacts}}
          {{name}}: {{type}} {{dxn}}
        {{/each}}
      {{/with}}
    `,
    inputs: [
      {
        name: 'initiative',
        kind: 'function',
        function: 'dxos.org/function/initiative/get-context',
      },
    ],
  }),
  tools: Blueprint.toolDefinitions({ functions: [update] }),
});
