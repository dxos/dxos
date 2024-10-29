//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useThemeContext, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type RowActionsMenuProps = {
  model?: TableModel;
  rowIndex: number | null;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const RowActionsMenu = ({ model, rowIndex, open, onOpenChange }: RowActionsMenuProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation(TABLE_PLUGIN);

  if (!model || rowIndex === null) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          <DropdownMenu.Item onClick={() => model.deleteRow(rowIndex)}>{t('delete row label')}</DropdownMenu.Item>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
