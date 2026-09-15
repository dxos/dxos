//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { Menu, toLocalizedString, useTranslation } from '@dxos/react-ui';

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
    <Menu.Root modal={false} open={true} onOpenChange={modals.close}>
      <Menu.VirtualTrigger virtualRef={modals.trigger} />
      <Menu.Content>
        <Menu.Viewport>
          {/* Custom actions */}
          {model.rowActions?.length > 0 && (
            <>
              <Menu.Group>
                {model.rowActions?.map((action) => (
                  <Menu.Item
                    key={action.id}
                    data-testid={`row-action-${action.id}`}
                    onClick={() => {
                      modals.close();
                      model.handleRowAction(action.id, state.rowIndex);
                    }}
                  >
                    {toLocalizedString(action.label, t)}
                  </Menu.Item>
                ))}
              </Menu.Group>
              <Menu.Separator />
            </>
          )}
          {/* Default actions */}
          {model.features.dataEditable !== false && (
            <Menu.Item data-testid='row-menu-delete' onClick={() => model.deleteRow(state.rowIndex)}>
              {t(hasSelection ? 'bulk-delete-row.label' : 'delete-row.label')}
            </Menu.Item>
          )}
        </Menu.Viewport>
        <Menu.Arrow />
      </Menu.Content>
    </Menu.Root>
  );
};
