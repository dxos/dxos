//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
  TriggerKind,
} from '@dxos/functions';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type CustomInputMap, Form, SelectInput, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { FunctionPayloadEditor } from './FunctionPayloadEditor';
import { AUTOMATION_PLUGIN } from '../../meta';

// TODO(ZaymonFC):
//   - Error changing trigger type once payload or other information is set.

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTriggerType;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, onSave, onCancel }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  const functions = useQuery(space, Filter.schema(FunctionType));
  const workflows = useQuery(space, Filter.schema(ComputeGraph));
  const scripts = useQuery(space, Filter.schema(ScriptType));

  const handleSave = (values: FunctionTriggerType) => {
    onSave?.(values);
  };

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const Custom = useMemo(
    (): CustomInputMap => ({
      ['function' satisfies keyof FunctionTriggerType]: (props) => (
        <SelectInput
          {...props}
          options={getWorkflowOptions(workflows).concat(getFunctionOptions(scripts, functions))}
        />
      ),
      ['spec.type' as const]: (props) => (
        <SelectInput
          {...props}
          options={Object.values(TriggerKind).map((kind) => ({
            value: kind,
            label: t(`trigger type ${kind}`),
          }))}
        />
      ),
      ['spec.payload' as const]: (props) => (
        <FunctionPayloadEditor {...props} functions={functions} onQueryRefOptions={handleRefQueryLookup} />
      ),
    }),
    [workflows, scripts, functions, t],
  );

  return (
    <div role='none' className='bs-full is-full'>
      <Form
        schema={FunctionTriggerSchema}
        values={trigger}
        onSave={handleSave}
        onCancel={onCancel}
        Custom={Custom}
        onQueryRefOptions={handleRefQueryLookup}
      />
    </div>
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: ScriptType[], functions: FunctionType[]) => {
  const getLabel = (fn: FunctionType) => scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:worker:${fn.name}` }));
};
