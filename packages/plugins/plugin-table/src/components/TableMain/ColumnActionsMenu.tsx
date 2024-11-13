//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

type ColumnActionsMenuProps = { model?: TableModel };

export const ColumnActionsMenu = ({ model }: ColumnActionsMenuProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const state = model?.modalController.state.value;

  if (!model || state?.type !== 'column') {
    return null;
  }

  const currentSort = model.sorting;
  const isCurrentColumnSorted = currentSort?.fieldId === state.fieldId;

  return (
    <DropdownMenu.Root modal={false} open={state?.type === 'column'} onOpenChange={model.modalController.close}>
      <DropdownMenu.VirtualTrigger virtualRef={model.modalController.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
              <DropdownMenu.Item onClick={() => model.setSort(state.fieldId, 'desc')}>
                {t('column action sort descending')}
              </DropdownMenu.Item>
            )}
            {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
              <DropdownMenu.Item onClick={() => model.setSort(state.fieldId, 'asc')}>
                {t('column action sort ascending')}
              </DropdownMenu.Item>
            )}
            {isCurrentColumnSorted && (
              <DropdownMenu.Item onClick={() => model.clearSort()}>
                {t('column action clear sorting')}
              </DropdownMenu.Item>
            )}
            {model.getColumnCount() > 1 && (
              <DropdownMenu.Item onClick={() => model.deleteColumn(state.fieldId)}>
                {t('column action delete')}
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item onClick={() => model.modalController.openColumnSettings()}>
              {t('column action settings')}
            </DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
