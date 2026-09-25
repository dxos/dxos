//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { Menu, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { type ModalController, type TableModel } from '../../model/index.ts';

export type ColumnActionsMenuProps = {
  model: TableModel;
  modals: ModalController;
};

export const ColumnActionsMenu = ({ model, modals }: ColumnActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const state = useAtomValue(modals.state);
  if (state?.type !== 'column') {
    return null;
  }

  const currentSort = model.getSorting();
  const isCurrentColumnSorted = currentSort?.fieldId === state.fieldId;

  return (
    <Menu.Root modal={false} open={true} onOpenChange={modals.close}>
      <Menu.VirtualTrigger virtualRef={modals.trigger} />
      <Menu.Portal>
        <Menu.Content>
          <Menu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <Menu.Item data-testid='column-sort-descending' onClick={() => model.setSort(state.fieldId, 'desc')}>
                {t('column-action-sort-descending.menu')}
              </Menu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <Menu.Item data-testid='column-sort-ascending' onClick={() => model.setSort(state.fieldId, 'asc')}>
                {t('column-action-sort-ascending.menu')}
              </Menu.Item>
            )}
            {isCurrentColumnSorted && (
              <Menu.Item data-testid='column-clear-sort' onClick={() => model.clearSort()}>
                {t('column-action-clear-sorting.menu')}
              </Menu.Item>
            )}
            {model.getColumnCount() > 1 && model.features.schemaEditable && (
              <Menu.Item data-testid='column-delete' onClick={() => model.deleteColumn(state.fieldId)}>
                {t('column-action-delete.menu')}
              </Menu.Item>
            )}
            {model.features.schemaEditable && (
              <Menu.Item data-testid='column-settings' onClick={() => modals.openColumnSettings()}>
                {t('column-action-settings.menu')}
              </Menu.Item>
            )}
          </Menu.Viewport>
          <Menu.Arrow />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
};
