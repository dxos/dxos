//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { type TableModel, type ModalController } from '../../model';
import { translationKey } from '../../translations';

type RowActionsMenuProps = { model: TableModel; modals: ModalController };

export const RowActionsMenu = ({ model, modals }: RowActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const hasSelection = model.selection.hasSelection.value;
  const state = modals.state.value;
  if (state?.type !== 'row') {
    return null;
  }
  return (
    <DropdownMenu.Root modal={false} open={true} onOpenChange={modals.close}>
      <DropdownMenu.VirtualTrigger virtualRef={modals.trigger} />
      <DropdownMenu.Content>
        <DropdownMenu.Viewport>
          <DropdownMenu.Item data-testid='row-menu-delete' onClick={() => model.deleteRow(state.rowIndex)}>
            {t(hasSelection ? 'bulk delete row label' : 'delete row label')}
          </DropdownMenu.Item>
        </DropdownMenu.Viewport>
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
