//
// Copyright 2024 DXOS.org
//

import React, { type RefObject } from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type ColumnActionsMenuProps = {
  triggerRef: RefObject<HTMLButtonElement>;
  model?: TableModel;
  fieldId?: string;
  onShowColumnSettings: () => void;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnActionsMenu = ({
  triggerRef,
  model,
  fieldId,
  open,
  onOpenChange,
  onShowColumnSettings,
}: ColumnActionsMenuProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);

  if (!model || !fieldId) {
    return null;
  }

  const currentSort = model.sorting.value;
  const isCurrentColumnSorted = currentSort?.fieldId === fieldId;

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <DropdownMenu.Item onClick={() => model.setSort(fieldId, 'desc')}>
                {t('column action sort descending')}
              </DropdownMenu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <DropdownMenu.Item onClick={() => model.setSort(fieldId, 'asc')}>
                {t('column action sort ascending')}
              </DropdownMenu.Item>
            )}
            {isCurrentColumnSorted && (
              <DropdownMenu.Item onClick={() => model.clearSort()}>
                {t('column action clear sorting')}
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item onClick={() => model.deleteColumn(fieldId)}>
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
