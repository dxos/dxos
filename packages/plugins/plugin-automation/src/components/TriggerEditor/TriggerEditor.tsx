//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useCallback } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
  TriggerKind,
  type TriggerType,
} from '@dxos/functions';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type CustomInputMap, Form, SelectInput, useInputProps, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { FunctionPayloadEditor } from './FunctionPayloadEditor';
import { AUTOMATION_PLUGIN } from '../../meta';

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
      ['spec.type' as const]: (props) => {
        const specProps = useInputProps(['spec' satisfies keyof FunctionTriggerType]);

        const handleTypeChange = useCallback(
          (_type: any, value: string): TriggerType | undefined => {
            const getDefaultTriggerSpec = (kind: string) => {
              switch (kind) {
                case TriggerKind.Timer:
                  return { type: TriggerKind.Timer, cron: '' };
                case TriggerKind.Subscription:
                  return { type: TriggerKind.Subscription, filter: {} };
                case TriggerKind.Queue:
                  return { type: TriggerKind.Queue, queue: '' };
                case TriggerKind.Email:
                  return { type: TriggerKind.Email };
                case TriggerKind.Webhook:
                  return { type: TriggerKind.Webhook };
                default:
                  return undefined;
              }
            };

            const defaultSpec = getDefaultTriggerSpec(value);
            if (!defaultSpec) {
              return;
            }

            // Update the entire spec object, not just the `spec.type`.
            specProps.onValueChange('object', defaultSpec);
          },
          [specProps],
        );

        const options = useMemo(
          () =>
            Object.values(TriggerKind).map((kind) => ({
              value: kind,
              label: t(`trigger type ${kind}`),
            })),
          [t],
        );

        return <SelectInput {...props} options={options} onValueChange={handleTypeChange} />;
      },
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
