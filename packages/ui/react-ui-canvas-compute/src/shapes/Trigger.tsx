//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import {
  EmailTriggerOutput,
  QueueTriggerOutput,
  SubscriptionTriggerOutput,
  TimerTriggerOutput,
  VoidInput,
  WebhookTriggerOutput,
} from '@dxos/conductor';
import { ObjectId, Ref, S } from '@dxos/echo-schema';
import {
  type EmailTrigger,
  FunctionTrigger,
  type QueueTrigger,
  type SubscriptionTrigger,
  type TimerTrigger,
  TriggerKind,
  type TriggerType,
  type WebhookTrigger,
} from '@dxos/functions/types';
import { DXN, SpaceId } from '@dxos/keys';
import { create, makeRef, useSpace } from '@dxos/react-client/echo';
import { Select, type SelectRootProps } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors, FunctionBody, getHeight } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';

export const TriggerShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('trigger'),
    functionTrigger: S.optional(Ref(FunctionTrigger)),
  }),
);
export type TriggerShape = S.Schema.Type<typeof TriggerShape>;

export type CreateTriggerProps = CreateShapeProps<Omit<TriggerShape, 'functionTrigger'>> & {
  spaceId?: SpaceId;
  triggerKind?: TriggerKind;
};

export const createTrigger = (props: CreateTriggerProps): TriggerShape => {
  const functionTrigger = create(FunctionTrigger, {
    enabled: true,
    spec: createTriggerSpec(props),
  });
  return createShape<TriggerShape>({
    type: 'trigger',
    functionTrigger: makeRef(functionTrigger),
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
    shape.size.height = getHeight(getOutputSchema(functionTrigger?.spec?.type ?? TriggerKind.Email));
  }, [functionTrigger?.spec?.type]);

  const setKind = (kind: TriggerKind) => {
    if (functionTrigger?.spec?.type !== kind) {
      functionTrigger!.spec = createTriggerSpec({ triggerKind: TriggerKind.Email, spaceId: space?.id });
    }
  };

  if (!functionTrigger?.spec) {
    return;
  }

  return (
    <FunctionBody
      shape={shape}
      status={
        <TriggerKindSelect value={functionTrigger.spec?.type} onValueChange={(kind) => setKind(kind as TriggerKind)} />
      }
      inputSchema={VoidInput}
      outputSchema={getOutputSchema(functionTrigger.spec!.type!)}
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
            {Object.values(TriggerKind).map((type) => (
              <Select.Option key={type} value={type}>
                {type}
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
      return { type: TriggerKind.Timer, cron: '*/10 * * * * *' } satisfies TimerTrigger;
    case TriggerKind.Webhook:
      return { type: TriggerKind.Webhook, method: 'POST' } satisfies WebhookTrigger;
    case TriggerKind.Subscription:
      return { type: TriggerKind.Subscription, filter: {} } satisfies SubscriptionTrigger;
    case TriggerKind.Email:
      return { type: TriggerKind.Email } satisfies EmailTrigger;
    case TriggerKind.Queue: {
      const dxn = new DXN(DXN.kind.QUEUE, ['data', props.spaceId ?? SpaceId.random(), ObjectId.random()]).toString();
      return { type: TriggerKind.Queue, queue: dxn } satisfies QueueTrigger;
    }
  }
};

const getOutputSchema = (kind: TriggerKind) => {
  const kindToSchema: Record<TriggerKind, S.Schema<any>> = {
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
      getOutputSchema(shape.functionTrigger?.target?.spec?.type ?? TriggerKind.Email),
    ),
};
