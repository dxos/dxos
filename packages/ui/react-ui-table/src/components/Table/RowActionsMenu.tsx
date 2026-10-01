//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '#translations';

import { type ModalController, type TableModel } from '../../model/index.ts';

type RowActionsMenuProps = { model: TableModel; modals: ModalController };

export const RowActionsMenu = ({ model, modals }: RowActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const hasSelection = model.selection.hasSelection;
  const state = useAtomValue(modals.state);
  if (state?.type !== 'row') {
    return null;
  }
  return (
    <Next.Menu.Root
      modal={false}
      open={true}
      onOpenChange={modals.close}
      positioning={Next.virtualAnchor(modals.trigger)}
    >
      <Next.Menu.Content>
        {/* Custom actions */}
        {model.rowActions?.length > 0 && (
          <>
            <Next.Menu.ItemGroup>
              {model.rowActions?.map((action) => (
                <Next.Menu.Item
                  key={action.id}
                  data-testid={`row-action-${action.id}`}
                  onClick={() => {
                    modals.close();
                    model.handleRowAction(action.id, state.rowIndex);
                  }}
                  item={{ value: action.id, label: toLocalizedString(action.label, t) }}
                />
              ))}
            </Next.Menu.ItemGroup>
            <Next.Menu.Separator />
          </>
        )}
        {/* Default actions */}
        {model.features.dataEditable !== false && (
          <Next.Menu.Item
            data-testid='row-menu-delete'
            onClick={() => model.deleteRow(state.rowIndex)}
            item={{
              value: t(hasSelection ? 'bulk-delete-row.label' : 'delete-row.label'),
              label: t(hasSelection ? 'bulk-delete-row.label' : 'delete-row.label'),
            }}
          />
        )}
      </Next.Menu.Content>
    </Next.Menu.Root>
  );
};
