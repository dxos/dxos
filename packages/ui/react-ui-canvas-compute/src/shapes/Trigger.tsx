//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import * as Trigger from '@dxos/compute/Trigger';
import { VoidInput } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { useSpaces } from '@dxos/react-client/echo';
import * as Select from '@dxos/react-ui/Select';

import { type ComputeNodeViewProps, FunctionBody, getHeight } from './common/index.ts';
import { type TriggerShape } from './trigger-def.ts';
import { createTriggerSpec, getOutputSchema } from './trigger-spec.ts';

export type TriggerComponentProps = ComputeNodeViewProps<TriggerShape>;

export const TriggerComponent = ({ node: shape }: TriggerComponentProps) => {
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
      status={<TriggerKindSelect value={functionTrigger.spec?.kind} onValueChange={setKind} />}
      inputSchema={VoidInput}
      outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}
    />
  );
};

// TODO(burdon): Factor out.
type TriggerKindSelectProps = {
  value?: Trigger.Kind;
  onValueChange: (kind: Trigger.Kind) => void;
};

const TriggerKindSelect = ({ value, onValueChange }: TriggerKindSelectProps) => {
  return (
    <Select.Root
      value={value === undefined ? [] : [value]}
      onValueChange={({ value: [next] }) => {
        const kind = Trigger.Kinds.find((kind) => kind === next);
        if (kind) {
          onValueChange(kind);
        }
      }}
      items={Trigger.Kinds.map((kind) => ({ value: kind, label: kind }))}
    >
      <Select.Trigger classNames='w-full px-0!' />
      <Select.Content>
        {Trigger.Kinds.map((kind) => (
          <Select.Item key={kind} item={{ value: kind, label: kind }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
