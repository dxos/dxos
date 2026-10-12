//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Trigger from '@dxos/compute/Trigger';
import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { VoidInput } from '@dxos/conductor';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

import { createFunctionPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { createTriggerSpec, getOutputSchema } from './trigger-spec.ts';
import { TriggerComponent } from './Trigger.tsx';

// Kept out of `Trigger.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/** The struct behind `TriggerShape`, for hosts that compose their own union (the scene engine). */
export const TriggerShapeSchema = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('trigger'),
    functionTrigger: Schema.optional(Ref.Ref(Trigger.Trigger)),
  }),
);

// TODO(wittjosiah): Try to clean up this type inference.
export interface TriggerShape extends ComputeShape {
  type: 'trigger';
  functionTrigger?: Ref.Ref<Trigger.Trigger>;
}

export const TriggerShape: Schema.Codec<TriggerShape> = TriggerShapeSchema as any;

export type CreateTriggerProps = CreateShapeProps<Omit<TriggerShape, 'functionTrigger'>> & {
  spaceId?: SpaceId;
  triggerKind?: Trigger.Kind;
};

export const createTrigger = (props: CreateTriggerProps): TriggerShape => {
  const functionTrigger = Trigger.make({
    enabled: true,
    spec: createTriggerSpec(props),
  });
  return createShape<TriggerShape>({
    type: 'trigger',
    functionTrigger: Ref.make(functionTrigger),
    size: { width: 192, height: getHeight(TriggerEvent.EmailEvent) },
    ...props,
  });
};

export const triggerNodeDef = defineComputeNode<TriggerShape>({
  type: 'trigger',
  name: 'Trigger',
  icon: 'ph--lightning--regular',
  group: 'Inputs',
  schema: withZ(TriggerShapeSchema),
  component: TriggerComponent,
  create: createTrigger,
  // The factory makes an ECHO object, so the default size is stated rather than sampled.
  defaultSize: { width: 192, height: getHeight(TriggerEvent.EmailEvent) },
  ports: (shape) =>
    createFunctionPorts(shape.size, VoidInput, getOutputSchema(shape.functionTrigger?.target?.spec?.kind ?? 'email')),
});
