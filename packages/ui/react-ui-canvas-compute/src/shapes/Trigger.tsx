//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useEffect } from 'react';

import * as Trigger from '@dxos/compute/Trigger';
import { VoidInput } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { useSpaces } from '@dxos/react-client/echo';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';
import { Next } from '@dxos/react-ui/next';

import { FunctionBody, getHeight } from './common/index.ts';
import { type TriggerShape } from './trigger-def.ts';
import { createTriggerSpec, getOutputSchema } from './trigger-spec.ts';

type SelectRootProps = ComponentProps<typeof Next.Select.Root>;

export type TriggerComponentProps = ShapeComponentProps<TriggerShape>;

export const TriggerComponent = ({ shape }: TriggerComponentProps) => {
  const [space] = useSpaces();
  const functionTrigger = useResolveRef(shape.functionTrigger);

  useEffect(() => {
    if (functionTrigger && !functionTrigger.spec) {
      Obj.update(functionTrigger, (functionTrigger) => {
        functionTrigger.spec = createTriggerSpec({
          triggerKind: 'email',
          spaceId: space?.id,
        }) as Obj.Mutable<Trigger.Spec>;
      });
    }
  }, [functionTrigger, functionTrigger?.spec]);

  useEffect(() => {
    shape.size.height = getHeight(getOutputSchema(functionTrigger?.spec?.kind ?? 'email'));
  }, [functionTrigger?.spec?.kind]);

  const setKind = (kind: Trigger.Kind) => {
    if (functionTrigger?.spec?.kind !== kind) {
      Obj.update(functionTrigger!, (obj) => {
        obj.spec = createTriggerSpec({ triggerKind: kind, spaceId: space?.id }) as Obj.Mutable<Trigger.Spec>;
      });
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
const TriggerKindSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => {
  return (
    <Next.Select.Root value={value} onValueChange={onValueChange}>
      <Next.Select.Trigger variant='ghost' classNames='w-full px-0!' />
      <Next.Select.Content>
        {Trigger.Kinds.map((kind) => (
          <Next.Select.Item key={kind} item={{ value: kind, label: kind }} />
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};
