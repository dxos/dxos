//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type RowActionsMenuProps = {
  model?: TableModel;
  rowIndex?: number;
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const RowActionsMenu = ({ model, rowIndex, open, onOpenChange, triggerRef }: RowActionsMenuProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);

  if (!model || rowIndex === undefined) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => model.deleteRow(rowIndex)}>{t('delete row label')}</DropdownMenu.Item>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
