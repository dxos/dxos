//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { useMemo } from 'react';

import { DropdownMenu, useThemeContext, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../meta';
import { type TableModel } from '../table-model';

type ColumnActionsMenuProps = {
  tableModel: TableModel | undefined;
  columnId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ColumnActionsMenu: React.FC<ColumnActionsMenuProps> = ({ tableModel, columnId, open, onOpenChange }) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation(TABLE_PLUGIN);

  if (!tableModel || !columnId) {
    return null;
  }

  const currentSort = tableModel.sorting.value;
  const isCurrentColumnSorted = currentSort?.columnId === columnId;

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
            <DropdownMenu.Item onClick={() => tableModel.setSort(columnId, 'desc')}>
              {t('column action sort descending')}
            </DropdownMenu.Item>
          )}
          {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
            <DropdownMenu.Item onClick={() => tableModel.setSort(columnId, 'asc')}>
              {t('column action sort ascending')}
            </DropdownMenu.Item>
          )}
          {isCurrentColumnSorted && (
            <DropdownMenu.Item onClick={() => tableModel.clearSort()}>
              {t('column action clear sorting')}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onClick={() => {
              // TODO(Zan): Implement column settings action.
            }}
          >
            {t('column action settings')}
          </DropdownMenu.Item>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
