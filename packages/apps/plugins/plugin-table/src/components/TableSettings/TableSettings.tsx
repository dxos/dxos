//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { type TableType } from '@braneframe/types';
import { type DynamicEchoSchema } from '@dxos/echo-schema';
import { type DialogRootProps, Input, Select, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { SettingsDialog } from '../SettingsDialog';

const NEW_ID = '__new';

export type TableSettingsProps = {
  table: TableType;
  schemas?: DynamicEchoSchema[];
  onClose?: (success: boolean) => void;
} & Pick<DialogRootProps, 'open'>;

export const TableSettings = ({ open, onClose, table, schemas = [] }: TableSettingsProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);

  const handleValueChange = useCallback(
    (id: string) => {
      table.schema = schemas.find((schema) => schema.id === id) as any; // TODO(burdon): Allow set to undefined.
    },
    [table, schemas],
  );

  return (
    <SettingsDialog title={t('settings title')} open={open} onClose={onClose}>
      <Input.Root>
        <Input.TextInput
          placeholder={t('table name placeholder')}
          value={table.title ?? ''}
          onChange={(event) => (table.title = event.target.value)}
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
    </SettingsDialog>
  );
};
