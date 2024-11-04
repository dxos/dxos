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
  columnId?: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettingsModal = ({ model, columnId, open, onOpenChange, triggerRef }: ColumnSettingsModalProps) => {
  const field = useMemo<FieldProjectionType>(
    () => model?.table?.view?.fields.find((f) => f.path === columnId),
    [model?.table?.view?.fields, columnId],
  );

  if (!field || !model?.table?.view) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Content>
        <Field field={field} onSave={() => onOpenChange?.(false)} />
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
