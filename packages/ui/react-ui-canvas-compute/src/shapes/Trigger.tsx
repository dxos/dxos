//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useEffect } from 'react';

import { VoidInput } from '@dxos/conductor';
import { ObjectId, Ref } from '@dxos/echo/internal';
import {
  type EmailTrigger,
  EmailTriggerOutput,
  FunctionTrigger,
  type QueueTrigger,
  QueueTriggerOutput,
  type SubscriptionTrigger,
  SubscriptionTriggerOutput,
  type TimerTrigger,
  TimerTriggerOutput,
  TriggerKind,
  type TriggerType,
  type WebhookTrigger,
  WebhookTriggerOutput,
} from '@dxos/functions';
import { DXN, SpaceId } from '@dxos/keys';
import { live, useSpace } from '@dxos/react-client/echo';
import { Select, type SelectRootProps } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const TriggerShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('trigger'),
    functionTrigger: Schema.optional(Ref(FunctionTrigger)),
  }),
);
export type TriggerShape = Schema.Schema.Type<typeof TriggerShape>;

export type CreateTriggerProps = CreateShapeProps<Omit<TriggerShape, 'functionTrigger'>> & {
  spaceId?: SpaceId;
  triggerKind?: TriggerKind;
};

export const createTrigger = (props: CreateTriggerProps): TriggerShape => {
  const functionTrigger = live(FunctionTrigger, {
    enabled: true,
    spec: createTriggerSpec(props),
  });
  return createShape<TriggerShape>({
    type: 'trigger',
    functionTrigger: Ref.make(functionTrigger),
    size: { width: 192, height: getHeight(EmailTriggerOutput) },
    ...props,
  });
};

export type TriggerComponentProps = ShapeComponentProps<TriggerShape>;

export const TriggerComponent = ({ shape }: TriggerComponentProps) => {
  const space = useSpace();
  const functionTrigger = shape.functionTrigger?.target;

  useEffect(() => {
    if (functionTrigger && !functionTrigger.spec) {
      functionTrigger.spec = createTriggerSpec({ triggerKind: TriggerKind.Email, spaceId: space?.id });
    }
  }, [functionTrigger, functionTrigger?.spec]);

  useEffect(() => {
    shape.size.height = getHeight(getOutputSchema(functionTrigger?.spec?.kind ?? TriggerKind.Email));
  }, [functionTrigger?.spec?.kind]);

  const setKind = (kind: TriggerKind) => {
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
        <TriggerKindSelect value={functionTrigger.spec?.kind} onValueChange={(kind) => setKind(kind as TriggerKind)} />
      }
      inputSchema={VoidInput}
      outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}
    />
  );
};

// TODO(burdon): Factor out.
const TriggerKindSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.TriggerButton variant='ghost' classNames='w-full !px-0' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {Object.values(TriggerKind).map((kind) => (
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
};

const createTriggerSpec = (props: { triggerKind?: TriggerKind; spaceId?: SpaceId }): TriggerType => {
  const kind = props.triggerKind ?? TriggerKind.Email;
  switch (kind) {
    case TriggerKind.Timer:
      return { kind: TriggerKind.Timer, cron: '*/10 * * * * *' } satisfies TimerTrigger;
    case TriggerKind.Webhook:
      return { kind: TriggerKind.Webhook, method: 'POST' } satisfies WebhookTrigger;
    case TriggerKind.Subscription:
      return { kind: TriggerKind.Subscription, filter: {} } satisfies SubscriptionTrigger;
    case TriggerKind.Email:
      return { kind: TriggerKind.Email } satisfies EmailTrigger;
    case TriggerKind.Queue: {
      const dxn = new DXN(DXN.kind.QUEUE, ['data', props.spaceId ?? SpaceId.random(), ObjectId.random()]).toString();
      return { kind: TriggerKind.Queue, queue: dxn } satisfies QueueTrigger;
    }
  }
};

const getOutputSchema = (kind: TriggerKind) => {
  const kindToSchema: Record<TriggerKind, Schema.Schema<any>> = {
    [TriggerKind.Email]: EmailTriggerOutput,
    [TriggerKind.Subscription]: SubscriptionTriggerOutput,
    [TriggerKind.Timer]: TimerTriggerOutput,
    [TriggerKind.Webhook]: WebhookTriggerOutput,
    [TriggerKind.Queue]: QueueTriggerOutput,
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
    createFunctionAnchors(
      shape,
      VoidInput,
      getOutputSchema(shape.functionTrigger?.target?.spec?.kind ?? TriggerKind.Email),
    ),
};
