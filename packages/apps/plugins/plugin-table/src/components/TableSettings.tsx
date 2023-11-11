//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Table as TableType } from '@braneframe/types';
import { type Schema } from '@dxos/client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';

export type TableSettingsProps = {
  table?: TableType;
  schemas?: Schema[];
};

export const TableSettings = ({ table, schemas = [] }: TableSettingsProps) => {
  if (!table) {
    return null;
  }

  // TODO(burdon): Tailwind classes not working.

  return (
    <DensityProvider density='fine'>
      <div className={'flex flex-col gap-2 border'}>
        <Input.Root>
          <Input.TextInput
            placeholder='Table name'
            value={table.title ?? ''}
            onChange={(event) => (table.title = event.target.value)}
          />
        </Input.Root>
        {schemas.length > 0 && (
          <Input.Root>
            <Input.Label classNames='mbe-1 mbs-3'>Schema</Input.Label>
            <Select.Root>
              <Select.TriggerButton placeholder='Schema' classNames='is-full' />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {schemas.map(({ id, typename }) => (
                      <Select.Option key={id} value={id}>
                        {typename}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Input.Root>
        )}
      </div>
    </DensityProvider>
  );
};
