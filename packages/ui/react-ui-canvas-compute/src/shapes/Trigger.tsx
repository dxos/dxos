//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import * as Trigger from '@dxos/compute/Trigger';
import { VoidInput } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/Obj';
import { useSpaces } from '@dxos/react-client/echo';
import { Select, type SelectRootProps } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, getHeight } from './common/index.ts';
import { type TriggerShape } from './trigger-def.ts';
import { createTriggerSpec, getOutputSchema } from './trigger-spec.ts';

export type TriggerComponentProps = ShapeComponentProps<TriggerShape>;

export const TriggerComponent = ({ shape }: TriggerComponentProps) => {
  const [space] = useSpaces();
  const functionTrigger = shape.functionTrigger?.target;

  useEffect(() => {
    if (functionTrigger && !functionTrigger.spec) {
      Obj.update(functionTrigger, (functionTrigger) => {
        functionTrigger.spec = createTriggerSpec({ triggerKind: 'email', spaceId: space?.id }) as Mutable<Trigger.Spec>;
      });
    }
  }, [functionTrigger, functionTrigger?.spec]);

  useEffect(() => {
    shape.size.height = getHeight(getOutputSchema(functionTrigger?.spec?.kind ?? 'email'));
  }, [functionTrigger?.spec?.kind]);

  const setKind = (kind: Trigger.Kind) => {
    if (functionTrigger?.spec?.kind !== kind) {
      Obj.update(functionTrigger!, (obj) => {
        obj.spec = createTriggerSpec({ triggerKind: kind, spaceId: space?.id }) as Mutable<Trigger.Spec>;
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
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.TriggerButton variant='ghost' classNames='w-full px-0!' />
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
};
