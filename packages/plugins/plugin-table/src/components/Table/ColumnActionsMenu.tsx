//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useThemeContext, useTranslation } from '@dxos/react-ui';

import { TABLE_PLUGIN } from '../../meta';
import { type TableModel } from '../../model';

export type ColumnActionsMenuProps = {
  model?: TableModel;
  columnId?: string;
  onShowColumnSettings: () => void;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

// TODO(burdon): Factor out; take from common component from sheet.
export const ColumnActionsMenu = ({
  model,
  columnId,
  open,
  onOpenChange,
  onShowColumnSettings,
}: ColumnActionsMenuProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation(TABLE_PLUGIN);

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
          <DropdownMenu.Item onClick={() => model.deleteColumn(columnId)}>
            {t('column action delete')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={onShowColumnSettings}>{t('column action settings')}</DropdownMenu.Item>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
