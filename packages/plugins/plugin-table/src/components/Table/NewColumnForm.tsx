//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { DropdownMenu } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { createUniqueFieldForView, type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  model?: TableModel;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
};

export const NewColumnForm = ({ model, open, onClose: close, triggerRef }: NewColumnFormProps) => {
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
    setField(undefined);
    close();
  }, [model, field, close]);

  if (!field) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        <Field field={field} schema={model?.table.schema} onSave={handleCreate} />
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
