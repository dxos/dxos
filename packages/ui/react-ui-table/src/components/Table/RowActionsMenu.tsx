//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { translationKey } from '#translations';

import { type ModalController, type TableModel } from '../../model/index.ts';

type RowActionsMenuProps = { model: TableModel; modals: ModalController };

export const RowActionsMenu = ({ model, modals }: RowActionsMenuProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const hasSelection = model.selection.hasSelection;
  const state = useAtomValue(modals.state);
  if (state?.type !== 'row') {
    return null;
  }
  return (
    <Menu.Root
      open={true}
      onOpenChange={({ open }) => !open && modals.close()}
      positioning={VirtualAnchor.virtualAnchor(modals.trigger)}
    >
      <Menu.Content>
        {/* Custom actions */}
        {model.rowActions?.length > 0 && (
          <>
            <Menu.ItemGroup>
              {model.rowActions?.map((action) => (
                <Menu.Item
                  key={action.id}
                  data-testid={`row-action-${action.id}`}
                  onClick={() => {
                    modals.close();
                    model.handleRowAction(action.id, state.rowIndex);
                  }}
                  item={{ value: action.id, label: ThemeProvider.toLocalizedString(action.label, t) }}
                />
              ))}
            </Menu.ItemGroup>
            <Menu.Separator />
          </>
        )}
        {/* Default actions */}
        {model.features.dataEditable !== false && (
          <Menu.Item
            data-testid='row-menu-delete'
            onClick={() => model.deleteRow(state.rowIndex)}
            item={{
              value: t(hasSelection ? 'bulk-delete-row.label' : 'delete-row.label'),
              label: t(hasSelection ? 'bulk-delete-row.label' : 'delete-row.label'),
            }}
          />
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
