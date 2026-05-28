//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import React, { useCallback, useMemo } from 'react';

import { Operation, Script, Trigger } from '@dxos/compute';
import { ComputeGraph } from '@dxos/conductor';
import { Annotation, type Database, Entity, Feed, Filter, Obj, type Query, Ref, Type } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
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
  const fieldMap = useCustomInputs({ db, types, tags, readonlySpec });

  const handleValuesChanged = useCallback(
    (newValues: Partial<TriggerFormSchema>) => {
      Obj.update(trigger, (trigger) => {
        Object.assign(trigger, newValues);
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
            return formValue.uri;
          }
          return undefined;
        }, [props]);

        const handleOnValueChange = useCallback(
          (_type: any, uriString: string) => {
            const uri = EchoURI.tryParse(uriString);
            if (uri) {
              props.onValueChange(props.type, Ref.fromURI(uri));
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

      // Feed selector with parent labels.
      'spec.feed': (props) => {
        const getValue = useCallback(() => {
          const formValue = props.getValue();
          if (Ref.isRef(formValue)) {
            return formValue.uri.toString() as string;
          }
          return undefined;
        }, [props]);

        const handleOnValueChange = useCallback(
          (_type: any, dxnString: string) => {
            const uri = EchoURI.tryParse(dxnString);
            if (uri) {
              props.onValueChange(props.type, Ref.fromURI(uri));
            }
          },
          [props.type, props.onValueChange],
        );

        return (
          <SelectField
            {...props}
            getValue={getValue as any}
            onValueChange={handleOnValueChange}
            options={getFeedOptions(feeds)}
          />
        );
      },

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

const getObjectIconProps = (object: Entity.Unknown): { icon?: string; iconHue?: string } => {
  const type = Entity.getType(object);
  const schema = type ? Type.getSchema(type) : undefined;
  const annotation = schema ? Option.getOrUndefined(Annotation.IconAnnotation.get(schema)) : undefined;
  return annotation ? { icon: annotation.icon, iconHue: annotation.hue } : {};
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({
    label: `compute-${graph.id}`,
    value: Obj.getURI(graph),
    ...getObjectIconProps(graph),
  }));
};

const getFunctionOptions = (scripts: Script.Script[], functions: Operation.PersistentOperation[]) => {
  const getLabel = (fn: Operation.PersistentOperation) =>
    scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => {
    const { icon: schemaIcon, iconHue } = getObjectIconProps(fn);
    return {
      label: getLabel(fn),
      value: Obj.getURI(fn),
      icon: fn.icon ?? schemaIcon,
      iconHue,
    };
  });
};

const getFeedDisplayName = (feed: Feed.Feed): string =>
  Entity.getLabel(feed) ?? feed.name ?? Entity.getTypename(feed) ?? 'Feed';

const computeRefRole = (entity: Feed.Feed): string | undefined => {
  const parent = Obj.getParent(entity);
  if (!parent) {
    return undefined;
  }
  for (const key of Record.keys(parent)) {
    if (Ref.isRef(parent[key]) && parent[key].target?.id === entity.id) {
      return `$.${key}`;
    }
  }
  return undefined;
};

const getFeedOptions = (feeds: Feed.Feed[]) => {
  return feeds.map((feed) => {
    const parent = Obj.getParent(feed);
    const displayObject = parent ?? feed;
    const role = computeRefRole(feed);

    if (parent) {
      return {
        label: Entity.getLabel(parent) ?? Entity.getTypename(parent) ?? 'Parent',
        secondaryLabel: role ?? getFeedDisplayName(feed),
        value: Obj.getURI(feed),
        ...getObjectIconProps(displayObject),
      };
    }

    return {
      label: getFeedDisplayName(feed),
      secondaryLabel: role,
      value: Obj.getURI(feed),
      ...getObjectIconProps(displayObject),
    };
  });
};
