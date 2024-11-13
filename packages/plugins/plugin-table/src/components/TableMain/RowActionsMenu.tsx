//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DropdownMenu, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

type RowActionsMenuProps = { model: TableModel };

export const RowActionsMenu = ({ model }: RowActionsMenuProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const state = model.modalController.state.value;

  if (state?.type !== 'row') {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={true} onOpenChange={model.modalController.close}>
      <DropdownMenu.VirtualTrigger virtualRef={model.modalController.trigger} />
      <DropdownMenu.Content>
        <DropdownMenu.Viewport>
          <DropdownMenu.Item onClick={() => model.deleteRow(state.rowIndex)}>{t('delete row label')}</DropdownMenu.Item>
        </DropdownMenu.Viewport>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
