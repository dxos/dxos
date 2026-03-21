//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { DXN, type Database, Entity, Feed, Obj, type Query } from '@dxos/echo';
import { Script, Trigger } from '@dxos/functions';
import { Operation } from '@dxos/operation';
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

  const handleValuesChanged = useCallback(
    (newValues: Partial<TriggerFormSchema>) => {
      Obj.change(trigger, (t) => {
        Object.assign(t, newValues);
      });
    },
    [trigger],
  );

  const triggerSchema = useMemo(() => omitId(Trigger.Trigger), []);
  const defaultValues = useMemo(() => {
    const { id: _, ...values } = trigger;
    return values;
  }, [trigger]);

  return (
    <Form.Root<TriggerFormSchema>
      {...formProps}
      db={db}
      schema={triggerSchema}
      defaultValues={defaultValues}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
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
  const functions = useQuery(db, Filter.type(Operation.PersistentOperation));
  const workflows = useQuery(db, Filter.type(ComputeGraph));
  const scripts = useQuery(db, Filter.type(Script.Script));
  const feeds = useQuery(db, Filter.type(Feed.Feed));

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
      'spec.kind': (props) => <SpecSelector {...props} readonly={readonlySpec} />,

      // Queue feed selector with parent labels.
      'spec.queue': (props) => <SelectField {...props} options={getFeedQueueOptions(feeds)} />,

      // TODO(wittjosiah): Copied from ViewEditor.
      // Query input editor.
      'spec.query': (props) => {
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
      input: (props) => <FunctionInputEditor {...props} functions={functions} db={db} />,
    }),
    [workflows, scripts, functions, feeds, readonlySpec],
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: Script.Script[], functions: Operation.PersistentOperation[]) => {
  const getLabel = (fn: Operation.PersistentOperation) =>
    scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:echo:@:${fn.id}` }));
};

const getFeedQueueOptions = (feeds: Feed.Feed[]) => {
  return feeds.flatMap((feed) => {
    const queueDxn = Feed.getQueueDxn(feed);
    if (!queueDxn) {
      return [];
    }
    const parent = Obj.getParent(feed);
    const label = parent ? Entity.getLabel(parent) : Entity.getLabel(feed);
    return [{ label: label ?? feed.id, value: queueDxn.toString() }];
  });
};
