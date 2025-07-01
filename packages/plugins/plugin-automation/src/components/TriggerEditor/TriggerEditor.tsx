//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
} from '@dxos/functions';
import { Filter, Ref, useQuery, type Space } from '@dxos/react-client/echo';
import { type CustomInputMap, Form, SelectInput, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { FunctionInputEditor, type FunctionInputEditorProps } from './FunctionInputEditor';
import { SpecSelector } from './SpecSelector';

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTriggerType;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

export const TriggerEditor = ({ space, trigger, onSave, onCancel }: TriggerEditorProps) => {
  const handleSave = (values: FunctionTriggerType) => {
    onSave?.(values);
  };

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });
  const Custom = useCustomInputs(space, handleRefQueryLookup);

  return (
    <Form
      outerSpacing={false}
      Custom={Custom}
      schema={FunctionTriggerSchema}
      values={trigger}
      onSave={handleSave}
      onCancel={onCancel}
      onQueryRefOptions={handleRefQueryLookup}
    />
  );
};

const useCustomInputs = (space: Space, onQueryRefOptions: FunctionInputEditorProps['onQueryRefOptions']) => {
  const functions = useQuery(space, Filter.type(FunctionType));
  const workflows = useQuery(space, Filter.type(ComputeGraph));
  const scripts = useQuery(space, Filter.type(ScriptType));

  return useMemo(
    (): CustomInputMap => ({
      // Function selector.
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
            const dxn = Type.DXN.parse(dxnString);
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

      // Spec selector.
      ['spec.kind' as const]: SpecSelector,

      // Function input editor.
      ['input' as const]: (props) => (
        <FunctionInputEditor {...props} functions={functions} onQueryRefOptions={onQueryRefOptions} />
      ),
    }),
    [workflows, scripts, functions],
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: ScriptType[], functions: FunctionType[]) => {
  const getLabel = (fn: FunctionType) => scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:echo:@:${fn.id}` }));
};
