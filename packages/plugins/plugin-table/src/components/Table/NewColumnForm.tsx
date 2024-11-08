//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  model?: TableModel;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
};

export const NewColumnForm = ({ model, open, onClose: close, triggerRef }: NewColumnFormProps) => {
  const [stagedField, setStagedField] = useState<FieldType>();

  useEffect(() => {
    if (open && model?.table?.view) {
      // TODO(ZaymonFC): Create and stage a unique field for the view field set and schema.
    } else {
      setStagedField(undefined);
    }
  }, [open, model?.table?.view]);

  const handleClose = useCallback(() => {
    // TODO(ZaymonFC): Invoke a method on the projection to add new field.
    close();
    setStagedField(undefined);
  }, [close]);

  if (!stagedField || !model?.table?.view || !model.projection) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        <FieldEditor field={stagedField} projection={model.projection} view={model.table.view} onClose={handleClose} />
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
