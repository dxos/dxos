//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { FunctionTriggerSchema, type FunctionTriggerType, type FunctionTrigger, TriggerKind } from '@dxos/functions';
import { FunctionType, ScriptType } from '@dxos/plugin-script/types';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form, SelectInput } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTriggerType;
  storedTrigger?: FunctionTrigger;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, onSave, onCancel, storedTrigger }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const functions = useQuery(space, Filter.schema(FunctionType));
  const scripts = useQuery(space, Filter.schema(ScriptType));

  const handleSave = (values: FunctionTriggerType) => {
    onSave?.(values);
  };

  return (
    <Form<FunctionTriggerType>
      schema={FunctionTriggerSchema}
      values={trigger}
      filter={(props) => props.filter((p) => p.name !== 'meta')}
      onSave={handleSave}
      onCancel={onCancel}
      Custom={{
        ['function' satisfies keyof FunctionTriggerType]: (props) => (
          <SelectInput<FunctionTriggerType>
            {...props}
            options={functions.map((fn) => ({
              value: fn.name,
              label: getFunctionName(scripts, fn),
            }))}
          />
        ),
        ['spec.type' as const]: (props) => (
          <SelectInput<FunctionTriggerType>
            {...props}
            options={Object.values(TriggerKind).map((kind) => ({
              value: kind,
              label: t(`trigger type ${kind}`),
            }))}
          />
        ),
      }}
    />
  );
};

const getFunctionName = (scripts: ScriptType[], fn: FunctionType) => {
  return scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
};
