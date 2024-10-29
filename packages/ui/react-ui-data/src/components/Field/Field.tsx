//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FormatAnnotation, FieldValueType, type FieldType, FieldValueTypes } from '@dxos/schema';

import { translationKey } from '../../translations';
import { TextInput } from '../TextInput';

const PropertyFormat: FormatAnnotation = {
  filter: /^\w*$/,
  valid: /^\w+$/,
};

const configSections = {
  base: ['path', 'label', 'type'] as const,
  numeric: ['digits'] as const,
  ref: ['schema', 'property'] as const,
} as const;

type ConfigSection = keyof typeof configSections;

// TODO(ZaymonFC): Should this move to the schema module?
const typeFeatures: Partial<Record<FieldValueType, ConfigSection[]>> = {
  [FieldValueType.Number]: ['numeric'],
  [FieldValueType.Percent]: ['numeric'],
  [FieldValueType.Currency]: ['numeric'],
  [FieldValueType.Ref]: ['ref'],
} as const;

export type SchematicChangeType = 'path' | 'type' | 'digits' | 'ref';

export type FieldProps<T = {}> = ThemedClassName<{
  field: FieldType;
  schema?: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
  onSchematicChange?: (field: FieldType, changeType: SchematicChangeType) => void;
}>;

export const Field = <T = {},>({ classNames, field, autoFocus, readonly, onSchematicChange }: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);
  const features = React.useMemo(() => typeFeatures[field.type] ?? [], [field.type]);

  return (
    <div className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      <div className='flex flex-col w-full gap-1'>
        <Input.Root>
          <Input.Label classNames='px-1'>{t('field path label')}</Input.Label>
          <TextInput
            autoFocus={autoFocus}
            disabled={readonly}
            placeholder={t('field path placeholder')}
            format={PropertyFormat}
            value={field.path ?? ''}
            onChange={(event) => {
              field.path = event.target.value;
              onSchematicChange?.(field, 'path');
            }}
          />
        </Input.Root>
      </div>

      <div className='flex flex-col w-full gap-1'>
        <Input.Root>
          <Input.Label classNames='px-1'>{t('field label label')}</Input.Label>
          <Input.TextInput
            disabled={readonly}
            placeholder={t('field label placeholder')}
            value={field.label ?? ''}
            onChange={(event) => (field.label = event.target.value)}
          />
        </Input.Root>
      </div>

      <div className='flex flex-col w-full gap-1'>
        <Input.Root>
          <Input.Label classNames='px-1'>{t('field type label')}</Input.Label>
          <Select.Root
            value={field.type}
            onValueChange={(value) => {
              field.type = value as FieldValueType;
              onSchematicChange?.(field, 'type');
            }}
          >
            <Select.TriggerButton classNames='is-full' placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {FieldValueTypes.map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`field type ${type}`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Input.Root>
      </div>

      {features.includes('numeric') && (
        <div className='flex flex-col w-full gap-1'>
          <Input.Root>
            <Input.Label classNames='px-1'>{t('field digits label')}</Input.Label>
            <Input.TextInput
              disabled={readonly}
              value={field.digits ?? ''}
              type='number'
              onChange={(event) => {
                field.digits = parseInt(event.target.value, 10);
                onSchematicChange?.(field, 'digits');
              }}
            />
          </Input.Root>
        </div>
      )}

      {features.includes('ref') && (
        <>
          {/* TODO(Zaymonad):  */}
          <div className='flex flex-col w-full gap-1'>
            <Input.Root>
              <Input.Label classNames='px-1'>{t('field ref schema label')}</Input.Label>
              <Input.TextInput disabled={readonly} value={''} />
            </Input.Root>
          </div>

          <div className='flex flex-col w-full gap-1'>
            <Input.Root>
              <Input.Label classNames='px-1'>{t('field ref property label')}</Input.Label>
              <Input.TextInput disabled={readonly} value={''} />
            </Input.Root>
          </div>
        </>
      )}
    </div>
  );
};
