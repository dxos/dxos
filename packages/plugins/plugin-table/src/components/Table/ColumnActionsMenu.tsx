//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React from 'react';

import { LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { DropdownMenu, type DropdownMenuRootProps, useThemeContext, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type ColumnActionsMenuProps = {
  model?: TableModel;
  columnId: string | null;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

// TODO(burdon): Factor out; take from common component from sheet.
export const ColumnActionsMenu = ({ model, columnId, open, onOpenChange }: ColumnActionsMenuProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation(TABLE_PLUGIN);
  const dispatch = useIntentDispatcher();

  if (!model || !columnId) {
    return null;
  }

  const currentSort = model.sorting.value;
  const isCurrentColumnSorted = currentSort?.columnId === columnId;

  // TODO(thure): This is no good very (my) bad. Refactor as part of #7962.
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Content classNames='contents'>
        {/* TODO(burdon): Reuse/adapt react-ui? Otherwise mixes styling systems. */}
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          {(!isCurrentColumnSorted || currentSort?.direction === 'asc') && (
            <DropdownMenu.Item onClick={() => model.setSort(columnId, 'desc')}>
              {t('column action sort descending')}
            </DropdownMenu.Item>
          )}
          {(!isCurrentColumnSorted || currentSort?.direction === 'desc') && (
            <DropdownMenu.Item onClick={() => model.setSort(columnId, 'asc')}>
              {t('column action sort ascending')}
            </DropdownMenu.Item>
          )}
          {isCurrentColumnSorted && (
            <DropdownMenu.Item onClick={() => model.clearSort()}>{t('column action clear sorting')}</DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onClick={() => {
              // TODO(Zan): Implement inline field editor.
              // Currently we'll just show the view editor in the c11y sidebar.
              void dispatch({
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'complementary', state: true },
              });
            }}
          >
            {t('column action settings')}
          </DropdownMenu.Item>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
