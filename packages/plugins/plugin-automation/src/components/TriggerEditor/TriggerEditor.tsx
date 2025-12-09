//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { DXN, type Database, type Query } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { Filter, Ref, useQuery } from '@dxos/react-client/echo';
import { Input } from '@dxos/react-ui';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import {
  type ExcludeId,
  Form,
  FormFieldLabel,
  type FormFieldMap,
  type FormRootProps,
  SelectField,
  omitId,
} from '@dxos/react-ui-form';

import { FunctionInputEditor } from './FunctionInputEditor';
import { SpecSelector } from './SpecSelector';

type TriggerFormSchema = ExcludeId<typeof Trigger.Trigger>;

export type TriggerEditorProps = {
  db: Database.Database;
  trigger: Trigger.Trigger;
  // TODO(wittjosiah): This needs to apply to whole spec but currently only applies to spec.kind & spec.query.
  readonlySpec?: boolean;
} &
  // prettier-ignore
  Pick<QueryFormProps, 'types' | 'tags'> &
  Pick<FormRootProps<TriggerFormSchema>, 'onSave' | 'onCancel'>;

export const TriggerEditor = ({ db, types, tags, readonlySpec, trigger, ...formProps }: TriggerEditorProps) => {
  const fieldMap = useCustomInputs({
    db,
    types,
    tags,
    readonlySpec,
  });

  return (
    <Form.Root<TriggerFormSchema>
      {...formProps}
      schema={omitId(Trigger.Trigger)}
      values={trigger}
      db={db}
      fieldMap={fieldMap}
    >
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
          <Form.Actions />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

type UseCustomInputsProps = {
  db: Database.Database;
  readonlySpec?: boolean;
} & Pick<QueryFormProps, 'types' | 'tags'>;

const useCustomInputs = ({ db, readonlySpec, types, tags }: UseCustomInputsProps): FormFieldMap => {
  const functions = useQuery(db, Filter.type(Function.Function));
  const workflows = useQuery(db, Filter.type(ComputeGraph));
  const scripts = useQuery(db, Filter.type(Script.Script));

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
              props.onValueChange(props.type, ref);
            }
          },
          [props.type, props.onValueChange],
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
          (query: Query.Any) => props.onValueChange(props.type, { ast: query.ast }),
          [props.type, props.onValueChange],
        );

        return (
          <Input.Root>
            <FormFieldLabel label={props.label} asChild />
            <QueryForm initialQuery={(props.getValue() as any).ast} types={types} tags={tags} onChange={handleChange} />
          </Input.Root>
        );
      },

      // Function input editor.
      ['input' as const]: (props) => <FunctionInputEditor {...props} functions={functions} db={db} />,
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
