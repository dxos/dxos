//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type Table as TableType } from '@braneframe/types';
import { type Schema } from '@dxos/client/echo';
import { Button, Dialog, type DialogRootProps, Input, Select } from '@dxos/react-ui';

const NEW_ID = '__new';

export type TableSettingsProps = {
  table: TableType;
  schemas?: Schema[];
  onClose?: (success: boolean) => void; // TODO(burdon): Factor out success/failure incl. buttons.
} & Pick<DialogRootProps, 'open'>;

export const TableSettings = ({ open, onClose, table, schemas = [] }: TableSettingsProps) => {
  const success = useRef(false);
  useEffect(() => {
    success.current = false;
  }, [open]);

  const handleValueChange = (id: string) => {
    const schema = schemas.find((schema) => schema.id === id);
    if (schema) {
      table.schema = schema;
    }
  };

  // TODO(burdon): Prevent close by clicking away.
  return (
    <Dialog.Root modal={true} open={open} onOpenChange={() => onClose?.(success.current)}>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Title>Table</Dialog.Title>
          <div className={'flex flex-col pt-4 pb-8'}>
            <Input.Root>
              <Input.TextInput
                placeholder='Table name'
                value={table.title ?? ''}
                onChange={(event) => (table.title = event.target.value)}
              />
            </Input.Root>
            <Input.Root>
              <Input.Label classNames='mbe-1 mbs-3'>Schema</Input.Label>
              <Select.Root onValueChange={handleValueChange} value={table.schema?.id}>
                <Select.TriggerButton placeholder='Schema' classNames='is-full' />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {schemas.map(({ id, typename }) => (
                        <Select.Option key={id} value={id}>
                          {typename}
                        </Select.Option>
                      ))}
                      {schemas?.length > 0 && <Select.Separator />}
                      <Select.Option value={NEW_ID}>Create schema</Select.Option>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </Input.Root>
          </div>
          <div className='flex justify-center'>
            <div className='flex gap-4'>
              <Dialog.Close
                asChild
                onClick={() => {
                  success.current = true;
                }}
              >
                <Button variant='primary'>Create</Button>
              </Dialog.Close>
              <Button onClick={() => onClose?.(false)}>Cancel</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};
