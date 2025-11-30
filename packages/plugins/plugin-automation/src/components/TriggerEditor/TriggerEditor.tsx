//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { DXN, type Query } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { Filter, Ref, type Space, useQuery } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import { Form, FormFieldLabel, type FormFieldMap, SelectField, useRefQueryOptions } from '@dxos/react-ui-form';

import { FunctionInputEditor, type FunctionInputEditorProps } from './FunctionInputEditor';
import { SpecSelector } from './SpecSelector';

export type TriggerEditorProps = {
  space: Space;
  trigger: Trigger.Trigger;
  // TODO(wittjosiah): This needs to apply to whole spec but currently only applies to spec.kind & spec.query.
  readonlySpec?: boolean;
  onSave?: (trigger: Omit<Trigger.Trigger, 'id'>) => void;
  onCancel?: () => void;
} & Pick<QueryFormProps, 'types' | 'tags'>;

export const TriggerEditor = ({ space, trigger, readonlySpec, types, tags, onSave, onCancel }: TriggerEditorProps) => {
  const handleSave = ({ id: _, ...values }: Trigger.Trigger) => {
    onSave?.(values);
  };

  const handleRefQueryOptions = useRefQueryOptions({ space });
  const fieldMap = useCustomInputs({
    space,
    readonlySpec,
    types,
    tags,
    onQueryRefOptions: handleRefQueryOptions,
  });

  return (
    <Form
      fieldMap={fieldMap}
      schema={Trigger.Trigger}
      values={trigger}
      onSave={handleSave}
      onCancel={onCancel}
      onQueryRefOptions={handleRefQueryOptions}
    />
  );
};

type UseCustomInputsProps = {
  space: Space;
  readonlySpec?: boolean;
  onQueryRefOptions: FunctionInputEditorProps['onQueryRefOptions'];
} & Pick<QueryFormProps, 'types' | 'tags'>;

const useCustomInputs = ({
  space,
  readonlySpec,
  types,
  tags,
  onQueryRefOptions,
}: UseCustomInputsProps): FormFieldMap => {
  const functions = useQuery(space, Filter.type(Function.Function));
  const workflows = useQuery(space, Filter.type(ComputeGraph));
  const scripts = useQuery(space, Filter.type(Script.Script));

  return useMemo(
    (): FormFieldMap => ({
      // Function selector.
      ['function' satisfies keyof Trigger.Trigger]: (props) => {
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
          <SelectField
            {...props}
            getValue={getValue as any}
            onValueChange={handleOnValueChange}
            options={getWorkflowOptions(workflows).concat(getFunctionOptions(scripts, functions))}
          />
        );
      },

      // Spec selector.
      ['spec.kind' as const]: (props) => <SpecSelector {...props} readonly={readonlySpec} />,

      // TODO(wittjosiah): Copied from ViewEditor.
      // Query input editor.
      ['spec.query' as const]: (props) => {
        const handleChange = useCallback(
          (query: Query.Any) => props.onValueChange('object', { ast: query.ast }),
          [props.onValueChange],
        );

        return (
          <Input.Root>
            <FormFieldLabel label={props.label} asChild />
            <QueryForm initialQuery={(props.getValue() as any).ast} types={types} tags={tags} onChange={handleChange} />
          </Input.Root>
        );
      },

      // Function input editor.
      ['input' as const]: (props) => (
        <FunctionInputEditor {...props} functions={functions} onQueryRefOptions={onQueryRefOptions} />
      ),
    }),
    [workflows, scripts, functions, readonlySpec],
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: Script.Script[], functions: Function.Function[]) => {
  const getLabel = (fn: Function.Function) => scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:echo:@:${fn.id}` }));
};
