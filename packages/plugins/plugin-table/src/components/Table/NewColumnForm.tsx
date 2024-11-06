//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { type FieldProjectionType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  model?: TableModel;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
};

export const NewColumnForm = ({ model, open, onClose: close, triggerRef }: NewColumnFormProps) => {
  const [field, setField] = useState<FieldProjectionType | undefined>(undefined);
  useEffect(() => {
    if (open) {
      if (model?.table?.view) {
        // TODO(ZaymonFC): Create a unique field for the view field set and schema.
        // setField(create(createUniqueFieldForView(model.table.view)));
      } else {
        close();
      }
    }
  }, [open, close, model]);

  const handleCreate = useCallback(() => {
    if (!field || !model || !model?.table?.view) {
      close();
      return;
    }

    // TODO(ZaymonFC): Handle FieldProjectionType instead.
    // model.addColumn({ ...field });
    setField(undefined);
    close();
  }, [model, field, close]);

  if (!field || !model?.table?.view) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        {/* TODO(ZaymonFC): Restore */}
        {/* <Field values={field} onSave={handleCreate} /> */}
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
