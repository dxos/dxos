//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ComputeGraph } from '@dxos/conductor';
import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
  TriggerKind,
} from '@dxos/functions/types';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { type CustomInputMap, Form, type InputProps, SelectInput, TextInput, useInputProps } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTriggerType;
  onSave?: (trigger: Omit<FunctionTrigger, 'id'>) => void;
  onCancel?: () => void;
};

const PayloadInput = (props: InputProps & { property: string }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  // TODO(dmaretskyi): Prop name (`meta`) should be passed in.
  const inputProps = useInputProps(['meta', props.property]);
  return (
    <div role='none' className='flex items-center mt-2 gap-1'>
      <div role='none' className='flex-1'>
        <TextInput {...inputProps} type='string' label={props.property} />
      </div>
      <IconButton
        icon='ph--trash--regular'
        iconOnly
        classNames={'mt-6'}
        label={t('trigger meta remove')}
        onClick={() => {
          const newValues: any = { ...props.getValue() };
          delete newValues[props.property];
          props.onValueChange('object', newValues);
        }}
      />
    </div>
  );
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
        const payload = props.getValue() ?? {};
        useEffect(() => props.onValueChange('object', { ...payload }), []);
        const [newPayloadFieldName, setNewPayloadFieldName] = useState('');

        const handleAddPayload = useCallback(() => {
          if (newPayloadFieldName.length) {
            const payload = props.getValue() ?? {};
            const payloadWithNewProp = { ...payload, [newPayloadFieldName]: '' };
            setNewPayloadFieldName('');
            props.onValueChange('object', payloadWithNewProp);
          }
        }, [newPayloadFieldName, props.getValue, props.onValueChange]);

        return (
          <>
            <div>{/* TODO(wittjosiah): props.label */ 'Payload'}</div>
            {[...Object.keys(payload)].map((key) => (
              <PayloadInput key={key} property={key} {...props} />
            ))}
            <div role='none' className='flex items-center mt-2 gap-1 plb-1'>
              <div role='none' className='flex-1'>
                <Input.Root>
                  <Input.TextInput
                    placeholder={t('trigger payload prop name placeholder')}
                    value={newPayloadFieldName}
                    onChange={(event) => setNewPayloadFieldName(event.target.value)}
                  />
                </Input.Root>
              </div>
              <IconButton
                icon='ph--plus--regular'
                iconOnly
                label={t('trigger payload add')}
                onClick={handleAddPayload}
              />
            </div>
          </>
        );
      },
    }),
    [workflows, scripts, functions, t],
  );

  return (
    <Form<FunctionTriggerType>
      schema={FunctionTriggerSchema}
      values={trigger}
      onSave={handleSave}
      onCancel={onCancel}
      Custom={Custom}
    />
  );
};

const getWorkflowOptions = (graphs: ComputeGraph[]) => {
  return graphs.map((graph) => ({ label: `compute-${graph.id}`, value: `dxn:echo:@:${graph.id}` }));
};

const getFunctionOptions = (scripts: ScriptType[], functions: FunctionType[]) => {
  const getLabel = (fn: FunctionType) => scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
  return functions.map((fn) => ({ label: getLabel(fn), value: `dxn:worker:${fn.name}` }));
};
