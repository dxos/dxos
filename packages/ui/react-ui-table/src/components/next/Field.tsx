//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { type FieldType } from './types';
import { translationKey } from '../../translations';

export type FieldProps<T = {}> = ThemedClassName<{
  field: FieldType;
  schema: S.Schema<T>;
  readonly?: boolean;
}>;

export const Field = <T = {},>({ field, readonly }: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);

  return (
    <div className='flex flex-col w-full gap-2'>
      <div className='flex flex-col w-full gap-1'>
        <Input.Root>
          <Input.Label classNames='px-1'>{t('field path label')}</Input.Label>
          <Input.TextInput
            disabled={readonly}
            placeholder={t('field path placeholder')}
            value={field.path ?? ''}
            // onChange={(event) => onChange(event.target.value)}
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
            // onChange={(event) => onChange(event.target.value)}
          />
        </Input.Root>
      </div>

      <div className='flex flex-col w-full gap-1'>
        <Input.Root>
          <Input.Label classNames='px-1'>{t('field type label')}</Input.Label>
          <Select.Root
          // value={field.type}
          // onValueChange={(value) => setFormState((prevState) => ({ ...prevState, type: value }))}
          >
            <Select.TriggerButton classNames='is-full' placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {types.map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`field type ${type} label`)}
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

const types = ['string', 'number', 'boolean', 'ref'];
