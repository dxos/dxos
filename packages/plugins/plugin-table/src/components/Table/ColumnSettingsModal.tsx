//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { DropdownMenu, type DropdownMenuRootProps } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';
import { type FieldProjectionType } from '@dxos/schema';

import { type TableModel } from '../../model';

export type ColumnSettingsModalProps = {
  model?: TableModel;
  columnId?: string; // TODO(burdon): Rename property?
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettingsModal = ({ model, columnId, open, onOpenChange, triggerRef }: ColumnSettingsModalProps) => {
  const props = useMemo<FieldProjectionType | undefined>(() => {
    const field = model?.table?.view?.fields.find((f) => f.property === columnId);
    if (field) {
      return model?.projection.getFieldProjection(field.property);
    }
  }, [model?.table?.view?.fields, columnId]);

  if (!props) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        <Field field={props} onSave={() => onOpenChange?.(false)} />
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
