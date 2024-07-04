//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { type TableType } from '@braneframe/types';
import { type DynamicSchema } from '@dxos/echo-schema';
import { Button, type ButtonProps, Input, Select, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';

const NEW_ID = '__new';

export type TableSettingsProps = {
  table: TableType;
  schemas?: DynamicSchema[];
  onClickContinue?: ButtonProps['onClick'];
};

export const TableSettings = ({ onClickContinue, table, schemas = [] }: TableSettingsProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);

  const handleValueChange = useCallback(
    (id: string) => {
      table.schema = schemas.find((schema) => schema.id === id) as any; // TODO(burdon): Allow set to undefined.
    },
    [table, schemas],
  );

  return (
    <div role='none' className='max-is-64 mli-auto p-2 space-y-2'>
      <h2>{t('settings title')}</h2>
      <Input.Root>
        <Input.TextInput
          placeholder={t('table name placeholder')}
          value={table.name ?? ''}
          onChange={(event) => (table.name = event.target.value)}
        />
      </Input.Root>
      <Input.Root>
        <Input.Label classNames='mbe-1 mbs-3'>{t('table schema label')}</Input.Label>
        <Select.Root value={table.schema?.id ?? NEW_ID} onValueChange={handleValueChange}>
          <Select.TriggerButton placeholder={t('table schema label')} classNames='is-full' />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {schemas.map(({ id, typename }) => (
                  <Select.Option key={id} value={id}>
                    {typename}
                  </Select.Option>
                ))}
                {schemas?.length > 0 && <Select.Separator />}
                <Select.Option value={NEW_ID}>{t('new schema')}</Select.Option>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </Input.Root>
      <Button variant='primary' classNames='is-full' onClick={onClickContinue}>
        {t('continue label')}
      </Button>
    </div>
  );
};
