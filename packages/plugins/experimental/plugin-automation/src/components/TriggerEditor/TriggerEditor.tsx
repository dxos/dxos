//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import {
  FunctionType,
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  ScriptType,
  TriggerKind,
} from '@dxos/functions';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form, SelectInput, TextInput } from '@dxos/react-ui-form';

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
  const scripts = useQuery(space, Filter.schema(ScriptType));

  const handleSave = (values: FunctionTriggerType) => {
    onSave?.(values);
  };

  return (
    <Form<FunctionTriggerType>
      schema={FunctionTriggerSchema}
      values={trigger}
      onSave={handleSave}
      onCancel={onCancel}
      Custom={{
        ['function' satisfies keyof FunctionTriggerType]: (props) => (
          <SelectInput
            {...props}
            options={functions.map((fn) => ({
              value: fn.name,
              label: getFunctionName(scripts, fn),
            }))}
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
        ['meta' as const]: (props) => {
          const meta = props.getValue()!;

          const [newMetaFieldName, setNewMetaFieldName] = useState('');

          React.useEffect(() => props.onValueChange('object', { ...meta }), []);

          return (
            <>
              <div>{props.label}</div>
              {[...Object.keys(meta)].map((key) => {
                const compositeKey: any = `meta.${key}`;
                return (
                  <div key={compositeKey} role='none' className='flex items-center mt-2 gap-1'>
                    <div role='none' className='flex-1'>
                      <TextInput {...props} type={'string'} label={key} />
                    </div>
                    <IconButton
                      icon='ph--trash--regular'
                      iconOnly
                      classNames={'mt-6'}
                      label={t('trigger meta remove')}
                      onClick={() => {
                        const newValues: any = { ...props.getValue() };
                        delete newValues[key];
                        props.onValueChange('object', newValues);
                      }}
                    />
                  </div>
                );
              })}
              <div role='none' className='flex items-center mt-2 gap-1 plb-1'>
                <div role='none' className='flex-1'>
                  <Input.Root>
                    <Input.TextInput
                      placeholder={t('trigger meta prop name placeholder')}
                      value={newMetaFieldName}
                      onChange={(event) => setNewMetaFieldName(event.target.value)}
                    />
                  </Input.Root>
                </div>
                <IconButton
                  icon='ph--plus--regular'
                  iconOnly
                  label={t('trigger meta add')}
                  onClick={() => {
                    if (newMetaFieldName.length) {
                      const meta = props.getValue() ?? {};
                      const metaWithNewProp = { ...meta, [newMetaFieldName]: '' };
                      setNewMetaFieldName('');
                      props.onValueChange('object', metaWithNewProp);
                    }
                  }}
                />
              </div>
            </>
          );
        },
      }}
    />
  );
};

const getFunctionName = (scripts: ScriptType[], fn: FunctionType) => {
  return scripts.find((s) => fn.source?.target?.id === s.id)?.name ?? fn.name;
};
