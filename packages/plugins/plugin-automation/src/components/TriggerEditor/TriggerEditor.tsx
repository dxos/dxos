//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { DXN } from '@dxos/echo';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
} from '@dxos/functions';
import { Filter, Ref, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type CustomInputMap, Form, SelectInput, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { FunctionInputEditor } from './FunctionInputEditor';
import { SpecSelector } from './SpecSelector';
import { AUTOMATION_PLUGIN } from '../../meta';

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTriggerType;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, onSave, onCancel }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  const functions = useQuery(space, Filter.type(FunctionType));
  const workflows = useQuery(space, Filter.type(ComputeGraph));
  const scripts = useQuery(space, Filter.type(ScriptType));

  const handleSave = (values: FunctionTriggerType) => {
    onSave?.(values);
  };

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const Custom = useMemo(
    (): CustomInputMap => ({
      ['function' satisfies keyof FunctionTriggerType]: (props) => {
        const getValue = useCallback(() => {
          const formValue = props.getValue();
          if (Ref.isRef(formValue)) {
            return formValue.dxn.toString() as string;
          }
          return undefined;
        }, [props]);

        const handleOnValueChange = useCallback(
          (_type: any, dxnString: string) => {
            const dxn = DXN.parse(dxnString);
            if (dxn) {
              const ref = Ref.fromDXN(dxn);
              props.onValueChange('object', ref);
            }
          },
          [props.onValueChange],
        );

        return (
          <SelectInput
            {...props}
            getValue={getValue as any}
            onValueChange={handleOnValueChange}
            options={getWorkflowOptions(workflows).concat(getFunctionOptions(scripts, functions))}
          />
        );
      },
      ['spec.kind' as const]: SpecSelector,
      ['input' as const]: (props) => (
        <FunctionInputEditor {...props} functions={functions} onQueryRefOptions={handleRefQueryLookup} />
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
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:echo:@:${fn.id}` }));
};
