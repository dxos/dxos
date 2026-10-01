//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

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
    <Next.Menu.Root
      modal={false}
      open={true}
      onOpenChange={modals.close}
      positioning={Next.virtualAnchor(modals.trigger)}
    >
      <Next.Menu.Content>
        {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
          <Next.Menu.Item
            data-testid='column-sort-descending'
            onClick={() => model.setSort(state.fieldId, 'desc')}
            item={{ value: t('column-action-sort-descending.menu'), label: t('column-action-sort-descending.menu') }}
          />
        )}
        {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
          <Next.Menu.Item
            data-testid='column-sort-ascending'
            onClick={() => model.setSort(state.fieldId, 'asc')}
            item={{ value: t('column-action-sort-ascending.menu'), label: t('column-action-sort-ascending.menu') }}
          />
        )}
        {isCurrentColumnSorted && (
          <Next.Menu.Item
            data-testid='column-clear-sort'
            onClick={() => model.clearSort()}
            item={{ value: t('column-action-clear-sorting.menu'), label: t('column-action-clear-sorting.menu') }}
          />
        )}
        {model.getColumnCount() > 1 && model.features.schemaEditable && (
          <Next.Menu.Item
            data-testid='column-delete'
            onClick={() => model.deleteColumn(state.fieldId)}
            item={{ value: t('column-action-delete.menu'), label: t('column-action-delete.menu') }}
          />
        )}
        {model.features.schemaEditable && (
          <Next.Menu.Item
            data-testid='column-settings'
            onClick={() => modals.openColumnSettings()}
            item={{ value: t('column-action-settings.menu'), label: t('column-action-settings.menu') }}
          />
        )}
      </Next.Menu.Content>
    </Next.Menu.Root>
  );
};
