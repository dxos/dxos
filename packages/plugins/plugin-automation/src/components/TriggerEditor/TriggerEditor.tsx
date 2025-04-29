//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import { getDXN, type JsonPath, toEffectSchema, type TypeAnnotation } from '@dxos/echo-schema';
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
import { isNonNullable } from '@dxos/util';

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

  // TODO(ZaymonFC): We should have a hook that provisions this.
  const handleRefQueryLookup = (typeInfo: TypeAnnotation) => {
    // TODO(ZaymonFC): Use async, push async consumption down into form.
    const query = space.db.query(Filter.typename(typeInfo.typename));
    return query
      .runSync()
      .map((result) => {
        const dxn = getDXN(result.object);
        if (dxn) {
          // TODO(Zaymon): Better fallback object names?
          return { dxn, label: result?.object?.name ?? result?.object?.id ?? '' };
        }
        return undefined;
      })
      .filter(isNonNullable);
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
      // TODO(ZaymonFC): This should get it's own component.
      // TODO(ZaymonFC): When the input schema changes, we should set values to {}.
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
        const propertyCount = inputSchema?.properties ? Object.keys(inputSchema.properties).length : 0;

        const values = useMemo(() => props.getValue() ?? {}, [props]);

        const handleSave = useCallback(
          (values: any) => {
            props.onValueChange('object', values);
          },
          [props],
        );

        if (selectedFunction === undefined || effectSchema === undefined || propertyCount === 0) {
          return null;
        }

        return (
          <>
            <h3 className='text-md'>Function parameters</h3>
            {/* TODO(ZaymonFC): Try using <FormFields /> internal component for this nesting.
                                This would allow errors to flow up to the root context. */}
            <Form
              schema={effectSchema}
              values={values}
              classNames='p-0'
              onValuesChanged={handleSave}
              onQueryRefOptions={handleRefQueryLookup}
            />
          </>
        );
      },
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
