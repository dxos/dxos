//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { log } from '@dxos/log';
import { type MenuAction, type MenuActionHandler } from '@dxos/react-ui-menu';

import { type MailboxModel, type SortDirection } from '../model/mailbox-model';

export type SortActionProperties = { type: 'sort'; direction?: SortDirection };
export type FilterActionProperties = { type: 'filter'; visible?: boolean };

export type MailboxToolbarActionProperties = SortActionProperties | FilterActionProperties;

export type MailboxToolbarAction = MenuAction<MailboxToolbarActionProperties>;

export type MailboxToolbarState = {
  filterVisible: boolean;
  setFilterVisible: (visible: boolean) => void;
};

export const useMailboxToolbarAction = (props: {
  state: MailboxToolbarState;
  model: MailboxModel;
}): MenuActionHandler<MailboxToolbarAction> => {
  const { model, state } = props;

  return useCallback<MenuActionHandler<MailboxToolbarAction>>(
    (action: MailboxToolbarAction) => {
      switch (action.properties.type) {
        case 'sort': {
          const newDirection = model.sortDirection === 'asc' ? 'desc' : 'asc';
          model.sortDirection = newDirection;
          break;
        }
        case 'filter': {
          const newVisibility = !state.filterVisible;
          state.setFilterVisible(newVisibility);
          break;
        }
        default:
          log.error('Unknown action type', action);
      }
    },
    [model, state],
  );
};
