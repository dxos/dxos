//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { type JsonPath, toEffectSchema } from '@dxos/echo-schema';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
  TriggerKind,
} from '@dxos/functions/types';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type CustomInputMap, Form, SelectInput, useFormValues } from '@dxos/react-ui-form';

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
      // TODO(wittjosiah): Form should be able to handle arbitrary records by default.
      ['meta' as const]: (props) => {
        const selectedFunctionValue = useFormValues(['function' as JsonPath]);
        const selectedFunctionName = useMemo(
          () => selectedFunctionValue?.split('dxn:worker:').at(1),
          [selectedFunctionValue],
        );
        const selectedFunction = useMemo(
          () => functions.find((f) => f.name === selectedFunctionName),
          [functions, selectedFunctionName],
        );

        const inputSchema = useMemo(() => selectedFunction?.inputSchema, [selectedFunction]);
        const effectSchema = useMemo(() => (inputSchema ? toEffectSchema(inputSchema) : undefined), [inputSchema]);

        const payload = useMemo(() => props.getValue() ?? {}, [props]);

        const handleSave = useCallback(
          (values: any) => {
            props.onValueChange('object', values);
          },
          [props],
        );

        if (selectedFunction === undefined || effectSchema === undefined) {
          return null;
        }

        return (
          <>
            <h3 className='text-md'>Function parameters</h3>
            {/* TODO(ZaymonFC): Try using <FormFields /> internal component for this nesting.
                                This would allow errors to flow up to the root context. */}
            <Form schema={effectSchema} values={payload} classNames='p-0' onSave={handleSave} autoSave></Form>
          </>
        );
      },
    }),
    [workflows, scripts, functions, t],
  );

  return (
    <div role='none' className='bs-full is-full'>
      <Form schema={FunctionTriggerSchema} values={trigger} onSave={handleSave} onCancel={onCancel} Custom={Custom} />
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
