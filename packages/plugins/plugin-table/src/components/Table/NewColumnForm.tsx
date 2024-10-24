//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { type FieldType, FieldValueType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  tableModel?: TableModel;
  open: boolean;
  close: () => void;
};

// TODO(ZaymonFC): A util in `@dxos/schema` should look at the view and the
// schema and generate the new field. That's why I haven't moved this to ../../seed.
export const createStarterField = (): FieldType => {
  // TODO(ZaymonFC): Can't currently supply a schema since it's not in the registry when we
  // try to add it to the table
  return create({ path: 'newField', type: FieldValueType.Text }) as any;
};

export const NewColumnForm = ({ tableModel, open, close }: NewColumnFormProps) => {
  const { tx } = useThemeContext();
  const [field, setField] = useState(() => createStarterField());

  useEffect(() => {
    if (open) {
      setField(createStarterField());
    }
  }, [open]);

  const onCreate = useCallback(() => {
    tableModel?.table?.view?.fields?.push(field);
    // TODO(ZaymonFC): Use a module to update the view and schema at the same time!
    // TODO(ZaymonFC): Validate: that path and name are unique. Path should be non-empty.
    close();
  }, [tableModel, field]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          <div role='none' className='flex flex-col align-end'>
            <Field field={field} />
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
