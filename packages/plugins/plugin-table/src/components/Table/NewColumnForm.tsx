//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { addFieldToView, type FieldType, FieldValueType, getUniqueProperty, type ViewType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  model?: TableModel;
  open: boolean;
  onClose: () => void;
};

// TODO(ZaymonFC): A util in `@dxos/schema` should look at the view and the
// schema and generate the new field. That's why I haven't moved this to ../../seed.
export const createNewField = (view: ViewType): FieldType => {
  const field: FieldType = { path: getUniqueProperty(view), type: FieldValueType.String };
  return create(field);
};

export const NewColumnForm = ({ model, open, onClose: close }: NewColumnFormProps) => {
  const space = getSpace(model?.table);
  const { tx } = useThemeContext();
  const [field, setField] = useState<FieldType | undefined>(undefined);

  useEffect(() => {
    if (open) {
      if (model?.table?.view) {
        setField(createNewField(model.table.view));
      } else {
        close();
      }
    }
  }, [open, close, model]);

  const onCreate = useCallback(() => {
    if (!space || !field || !model || !model?.table?.view) {
      return;
    }

    try {
      const schema = space.db.schema.getSchemaByTypename(model.table.view.schema);
      if (schema) {
        addFieldToView(schema, model.table.view, field);
        close();
      }
    } catch (err) {
      // TODO(ZaymonFC): Present the error to the user.
      // This should be reconciled with error handling in the Field component.
    }
  }, [model, field, space, close]);

  if (!field) {
    return null;
  }

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
