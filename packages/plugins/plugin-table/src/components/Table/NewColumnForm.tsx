//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { createUniqueFieldForView, type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  model?: TableModel;
  open: boolean;
  onClose: () => void;
};

export const NewColumnForm = ({ model, open, onClose: close }: NewColumnFormProps) => {
  const { tx } = useThemeContext();
  const [field, setField] = useState<FieldType | undefined>(undefined);

  useEffect(() => {
    if (open) {
      if (model?.table?.view) {
        setField(create(createUniqueFieldForView(model.table.view)));
      } else {
        close();
      }
    }
  }, [open, close, model]);

  const handleCreate = useCallback(() => {
    if (!field || !model || !model?.table?.view) {
      return;
    }
    model.addColumn({ ...field });
    close();
  }, [model, field, close]);

  if (!field) {
    return null;
  }

  // TODO(ZaymonFC): Translations.
  // TODO(ZaymonFC): React-UI-Button.
  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          <div role='none' className='flex flex-col align-end'>
            <Field field={field} />
            <button className='ch-button mx-2 mb-2' onClick={handleCreate}>
              Create
            </button>
          </div>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
