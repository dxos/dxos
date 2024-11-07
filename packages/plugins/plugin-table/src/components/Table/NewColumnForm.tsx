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
  const [field, setField] = useState<FieldType>();

  useEffect(() => {
    if (open && model?.projection) {
      setField(model.projection.createFieldProjection());
    } else {
      setField(undefined);
    }
  }, [open, model?.projection]);

  const handleComplete = useCallback(() => {
    close();
  }, [close]);

  if (!model?.table?.view || !model.projection || !field) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={close}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        <FieldEditor field={field} projection={model.projection} view={model.table.view} onComplete={handleComplete} />
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
