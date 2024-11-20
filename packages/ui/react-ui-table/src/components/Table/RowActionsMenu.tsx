//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { type TableModel } from '../../model';
import { translationKey } from '../../translations';

type RowActionsMenuProps = { model: TableModel };

export const RowActionsMenu = ({ model }: RowActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const state = model.modalController.state.value;
  const hasSelection = model.selection.hasSelection.value;

  if (state?.type !== 'row') {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={true} onOpenChange={model.modalController.close}>
      <DropdownMenu.VirtualTrigger virtualRef={model.modalController.trigger} />
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
