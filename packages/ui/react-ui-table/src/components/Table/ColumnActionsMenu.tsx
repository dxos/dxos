//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { translationKey } from '#translations';

import { type ModalController, type TableModel } from '../../model/index.ts';

export type ColumnActionsMenuProps = {
  model: TableModel;
  modals: ModalController;
};

export const ColumnActionsMenu = ({ model, modals }: ColumnActionsMenuProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const state = useAtomValue(modals.state);
  if (state?.type !== 'column') {
    return null;
  }

  const currentSort = model.getSorting();
  const isCurrentColumnSorted = currentSort?.fieldId === state.fieldId;

  return (
    <Menu.Root
      open={true}
      onOpenChange={({ open }) => !open && modals.close()}
      positioning={VirtualAnchor.virtualAnchor(modals.trigger)}
    >
      <Menu.Content>
        {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
          <Menu.Item
            data-testid='column-sort-descending'
            onClick={() => model.setSort(state.fieldId, 'desc')}
            item={{ value: t('column-action-sort-descending.menu'), label: t('column-action-sort-descending.menu') }}
          />
        )}
        {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
          <Menu.Item
            data-testid='column-sort-ascending'
            onClick={() => model.setSort(state.fieldId, 'asc')}
            item={{ value: t('column-action-sort-ascending.menu'), label: t('column-action-sort-ascending.menu') }}
          />
        )}
        {isCurrentColumnSorted && (
          <Menu.Item
            data-testid='column-clear-sort'
            onClick={() => model.clearSort()}
            item={{ value: t('column-action-clear-sorting.menu'), label: t('column-action-clear-sorting.menu') }}
          />
        )}
        {model.getColumnCount() > 1 && model.features.schemaEditable && (
          <Menu.Item
            data-testid='column-delete'
            onClick={() => model.deleteColumn(state.fieldId)}
            item={{ value: t('column-action-delete.menu'), label: t('column-action-delete.menu') }}
          />
        )}
        {model.features.schemaEditable && (
          <Menu.Item
            data-testid='column-settings'
            onClick={() => modals.openColumnSettings()}
            item={{ value: t('column-action-settings.menu'), label: t('column-action-settings.menu') }}
          />
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
