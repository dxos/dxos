//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { FunctionTriggerSchema, type FunctionTriggerType, type FunctionTrigger, TriggerKind } from '@dxos/functions';
import { FunctionType } from '@dxos/plugin-script/types';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form, SelectInput } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';

export type TriggerEditorProps = {
  space: Space;
  trigger: Omit<FunctionTrigger, 'id'>;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, onSave, onCancel }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const functions = useQuery(space, Filter.schema(FunctionType));

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
            options={functions.map(({ name }) => ({
              value: name,
              label: name,
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
