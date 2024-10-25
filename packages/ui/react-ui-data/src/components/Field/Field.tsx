//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FormatAnnotation, type FieldValueType, type FieldType, FieldValueTypes } from '@dxos/schema';

import { translationKey } from '../../translations';
import { TextInput } from '../TextInput';

const PropertyFormat: FormatAnnotation = {
  filter: /^\w*$/,
  valid: /^\w+$/,
};

export type FieldProps<T = {}> = ThemedClassName<{
  field: FieldType;
  schema?: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
}>;

export const Field = <T = {},>({ classNames, field, autoFocus, readonly }: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);

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
            onChange={(event) => (field.path = event.target.value)}
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
    </div>
  );
};
