//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useEffect } from 'react';

import { VoidInput } from '@dxos/conductor';
import { Filter, Query } from '@dxos/echo';
import { ObjectId, Ref } from '@dxos/echo/internal';
import { Trigger, TriggerEvent } from '@dxos/functions';
import { DXN, SpaceId } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';
import { Select, type SelectRootProps } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const TriggerShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('trigger'),
    functionTrigger: Schema.optional(Ref(Trigger.Trigger)),
  }),
);
export type TriggerShape = Schema.Schema.Type<typeof TriggerShape>;

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

export type TriggerComponentProps = ShapeComponentProps<TriggerShape>;

export const TriggerComponent = ({ shape }: TriggerComponentProps) => {
  const space = useSpace();
  const functionTrigger = shape.functionTrigger?.target;

  useEffect(() => {
    if (functionTrigger && !functionTrigger.spec) {
      functionTrigger.spec = createTriggerSpec({ triggerKind: 'email', spaceId: space?.id });
    }
  }, [functionTrigger, functionTrigger?.spec]);

  useEffect(() => {
    shape.size.height = getHeight(getOutputSchema(functionTrigger?.spec?.kind ?? 'email'));
  }, [functionTrigger?.spec?.kind]);

  const setKind = (kind: Trigger.Kind) => {
    if (functionTrigger?.spec?.kind !== kind) {
      functionTrigger!.spec = createTriggerSpec({ triggerKind: kind, spaceId: space?.id });
    }
  };

  if (!functionTrigger?.spec) {
    return;
  }

  return (
    <FunctionBody
      shape={shape}
      status={
        <TriggerKindSelect value={functionTrigger.spec?.kind} onValueChange={(kind) => setKind(kind as Trigger.Kind)} />
      }
      inputSchema={VoidInput}
      outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}
    />
  );
};

// TODO(burdon): Factor out.
const TriggerKindSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.TriggerButton variant='ghost' classNames='w-full !px-0' />
    <Select.Portal>
      <Select.Content>
        <Select.ScrollUpButton />
        <Select.Viewport>
          {Trigger.Kinds.map((kind) => (
            <Select.Option key={kind} value={kind}>
              {kind}
            </Select.Option>
          ))}
        </Select.Viewport>
        <Select.ScrollDownButton />
        <Select.Arrow />
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

const createTriggerSpec = (props: { triggerKind?: Trigger.Kind; spaceId?: SpaceId }): Trigger.Spec => {
  const kind = props.triggerKind ?? 'email';
  switch (kind) {
    case 'timer':
      return { kind: 'timer', cron: '*/10 * * * * *' } satisfies Trigger.TimerSpec;
    case 'webhook':
      return { kind: 'webhook', method: 'POST' } satisfies Trigger.WebhookSpec;
    case 'subscription':
      return {
        kind: 'subscription',
        query: {
          ast: Query.select(Filter.nothing()).ast,
        },
      } satisfies Trigger.SubscriptionSpec;
    case 'email':
      return { kind: 'email' } satisfies Trigger.EmailSpec;
    case 'queue': {
      const dxn = new DXN(DXN.kind.QUEUE, ['data', props.spaceId ?? SpaceId.random(), ObjectId.random()]).toString();
      return { kind: 'queue', queue: dxn } satisfies Trigger.QueueSpec;
    }
  }
};

const getOutputSchema = (kind: Trigger.Kind) => {
  const kindToSchema: Record<Trigger.Kind, Schema.Schema<any>> = {
    ['email']: TriggerEvent.EmailEvent,
    ['subscription']: TriggerEvent.SubscriptionEvent,
    ['timer']: TriggerEvent.TimerEvent,
    ['webhook']: TriggerEvent.WebhookEvent,
    ['queue']: TriggerEvent.QueueEvent,
  };
  return kindToSchema[kind];
};

export const triggerShape: ShapeDef<TriggerShape> = {
  type: 'trigger',
  name: 'Trigger',
  icon: 'ph--lightning--regular',
  component: TriggerComponent,
  createShape: createTrigger,
  getAnchors: (shape) =>
    createFunctionAnchors(shape, VoidInput, getOutputSchema(shape.functionTrigger?.target?.spec?.kind ?? 'email')),
};
