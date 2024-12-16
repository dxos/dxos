//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { type TableModel, type TableControls } from '../../model';
import { translationKey } from '../../translations';

type ColumnActionsMenuProps = { model: TableModel; controls: TableControls };

export const ColumnActionsMenu = ({ model, controls }: ColumnActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const state = controls.modals.state.value;
  if (state?.type !== 'column') {
    return null;
  }

  const currentSort = model.sorting;
  const isCurrentColumnSorted = currentSort?.fieldId === state.fieldId;

  return (
    <DropdownMenu.Root modal={false} open={true} onOpenChange={controls.modals.close}>
      <DropdownMenu.VirtualTrigger virtualRef={controls.modals.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <DropdownMenu.Item
                data-testid='column-sort-descending'
                onClick={() => model.setSort(state.fieldId, 'desc')}
              >
                {t('column action sort descending')}
              </DropdownMenu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <DropdownMenu.Item
                data-testid='column-sort-ascending'
                onClick={() => model.setSort(state.fieldId, 'asc')}
              >
                {t('column action sort ascending')}
              </DropdownMenu.Item>
            )}
            {isCurrentColumnSorted && (
              <DropdownMenu.Item data-testid='column-clear-sort' onClick={() => model.clearSort()}>
                {t('column action clear sorting')}
              </DropdownMenu.Item>
            )}
            {model.getColumnCount() > 1 && (
              <DropdownMenu.Item data-testid='column-delete' onClick={() => model.deleteColumn(state.fieldId)}>
                {t('column action delete')}
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item data-testid='column-settings' onClick={() => controls.modals.openColumnSettings()}>
              {t('column action settings')}
            </DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
