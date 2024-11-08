//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type ColumnActionsMenuProps = {
  model?: TableModel;
  columnId?: string;
  onShowColumnSettings: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnActionsMenu = ({
  model,
  columnId,
  open,
  onOpenChange,
  onShowColumnSettings,
  triggerRef,
}: ColumnActionsMenuProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);

  if (!model || !columnId) {
    return null;
  }

  const currentSort = model.sorting.value;
  const isCurrentColumnSorted = currentSort?.columnId === columnId;

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <DropdownMenu.Item onClick={() => model.setSort(columnId, 'desc')}>
                {t('column action sort descending')}
              </DropdownMenu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <DropdownMenu.Item onClick={() => model.setSort(columnId, 'asc')}>
                {t('column action sort ascending')}
              </DropdownMenu.Item>
            )}
            {isCurrentColumnSorted && (
              <DropdownMenu.Item onClick={() => model.clearSort()}>
                {t('column action clear sorting')}
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item onClick={() => model.deleteColumn(columnId)}>
              {t('column action delete')}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={onShowColumnSettings}>{t('column action settings')}</DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
