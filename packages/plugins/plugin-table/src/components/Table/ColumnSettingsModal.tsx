//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React from 'react';

import { DropdownMenu, type DropdownMenuRootProps, useThemeContext } from '@dxos/react-ui';
import { Field } from '@dxos/react-ui-data';

import { type TableModel } from '../../model';

export type ColumnSettingsModalProps = {
  model?: TableModel;
  columnId?: string;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettingsModal = ({ model, columnId, open, onOpenChange }: ColumnSettingsModalProps) => {
  const { tx } = useThemeContext();

  const field = React.useMemo(
    () => model?.table?.view?.fields.find((f) => f.path === columnId),
    [model?.table?.view?.fields, columnId],
  );

  if (!field) {
    return null;
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          <Field field={field} />
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
