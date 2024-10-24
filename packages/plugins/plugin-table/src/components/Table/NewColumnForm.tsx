//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useMemo } from 'react';

import { create } from '@dxos/echo-schema';
import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { FieldSchema, FieldValueType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  tableModel?: TableModel;
  open: boolean;
  close: () => void;
};

export const NewColumnForm = ({ tableModel, open, close }: NewColumnFormProps) => {
  const { tx } = useThemeContext();

  const initialField = useMemo(
    () =>
      create(FieldSchema, {
        // TODO(ZaymonFC): Unique name based on old fields, util in schema lib already.
        path: 'newField',
        type: FieldValueType.Text,
      }),
    [],
  );

  const onCreate = useCallback(() => {
    tableModel?.table?.view?.fields?.push(initialField);
    // TODO(ZaymonFC): Use a module to update the view and schema at the same time!
    // TODO(ZaymonFC): Validate: that path and name are unique. Path should be non-empty.
    close();
  }, [tableModel, initialField]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          <div role='none' className='flex flex-col align-end'>
            <Field field={initialField} />
            <button className='ch-button mx-2 mb-2' onClick={onCreate}>
              Create
            </button>
          </div>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
