import * as Schema from 'effect/Schema';
import { Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const Initiative = Schema.Struct({
  name: Schema.String,
  artifacts: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      data: Type.Ref(Obj.Any),
    }),
  ),
  chats: Schema.Array(Type.Ref(Obj.Any)), // TODO(dmaretskyi): Move Chat type here.

  // TODO(dmaretskyi): Triggers & input queue.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Initiative',
    version: '0.1.0',
  }),
);
export interface Initiative extends Schema.Schema.Type<typeof Initiative> {}

export const SPEC_ARTIFACT_NAME = 'Spec';

export const PLAN_ARTIFACT_NAME = 'Plan';

export const make = (
  props: Omit<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'chats'> &
    Partial<Pick<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'chats'>> & {
      spec: string;
      plan?: string;
      artifacts?: { name: string; data: Ref.Ref<Obj.Any> }[];
    },
) =>
  Obj.make(Initiative, {
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
    chats: props.chats ?? [],
  });

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
      
      Initiative spec:
        {{initiative.spec.dxn}}
        {{initiative.spec.content}}

      Initiative plan:
        {{initiative.plan.dxn}}
        {{initiative.plan.content}}

      Other artifacts:
      {{#with initative}}
        {{#each artifacts as artifact}}
          {{artifact.name}}: {{artifact.dxn}}
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
  tools: Blueprint.toolDefinitions({ functions: [] }),
});
