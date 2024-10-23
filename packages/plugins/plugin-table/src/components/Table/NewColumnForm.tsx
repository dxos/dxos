//
// Copyright 2024 DXOS.org
//

import * as ModalPrimitive from '@radix-ui/react-popper';
import React from 'react';

import { DropdownMenu, useThemeContext } from '@dxos/react-ui';

import { type TableModel } from '../../model';

type NewColumnFormProps = {
  tableModel?: TableModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const NewColumnForm = ({ open, onOpenChange }: NewColumnFormProps) => {
  const { tx } = useThemeContext();

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Content classNames='contents'>
        <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
          {/* TODO: Implement form */}
          <div>New Column Form (TODO)</div>
          <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
        </ModalPrimitive.Content>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
