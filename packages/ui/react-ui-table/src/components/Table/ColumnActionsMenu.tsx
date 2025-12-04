//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { type ModalController, type TableModel } from '../../model';
import { translationKey } from '../../translations';

export type ColumnActionsMenuProps = {
  model: TableModel;
  modals: ModalController;
};

export const ColumnActionsMenu = ({ model, modals }: ColumnActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const state = modals.state.value;
  if (state?.type !== 'column') {
    return null;
  }

  const currentSort = model.sorting?.sorting;
  const isCurrentColumnSorted = currentSort?.fieldId === state.fieldId;

  return (
    <DropdownMenu.Root modal={false} open={true} onOpenChange={modals.close}>
      <DropdownMenu.VirtualTrigger virtualRef={modals.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <DropdownMenu.Item
                data-testid='column-sort-descending'
                onClick={() => model.sorting?.setSort(state.fieldId, 'desc')}
              >
                {t('column action sort descending')}
              </DropdownMenu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <DropdownMenu.Item
                data-testid='column-sort-ascending'
                onClick={() => model.sorting?.setSort(state.fieldId, 'asc')}
              >
                {t('column action sort ascending')}
              </DropdownMenu.Item>
            )}
            {isCurrentColumnSorted && (
              <DropdownMenu.Item data-testid='column-clear-sort' onClick={() => model.sorting?.clearSort()}>
                {t('column action clear sorting')}
              </DropdownMenu.Item>
            )}
            {model.getColumnCount() > 1 && model.features.schemaEditable && (
              <DropdownMenu.Item data-testid='column-delete' onClick={() => model.deleteColumn(state.fieldId)}>
                {t('column action delete')}
              </DropdownMenu.Item>
            )}
            {model.features.schemaEditable && (
              <DropdownMenu.Item data-testid='column-settings' onClick={() => modals.openColumnSettings()}>
                {t('column action settings')}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
