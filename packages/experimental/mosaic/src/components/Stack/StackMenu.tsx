//
// Copyright 2022 DXOS.org
//

import { DotsThreeCircle } from '@phosphor-icons/react';
import React, { FC, useContext } from 'react';

import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, getSize } from '@dxos/react-components';

import { StackSectionContext } from './context';

export type StackMenuAction = {
  id: string;
  label: string;
  Icon: FC<any>;
};

export type StackMenuProps = {
  actions?: StackMenuAction[][];
  onAction?: (action: StackMenuAction, section?: any) => void; // TODO(burdon): Type.
};

export const StackMenu = ({ actions = [], onAction }: StackMenuProps) => {
  const { section } = useContext(StackSectionContext);
  const handleAction = (action: StackMenuAction) => {
    onAction?.(action, section);
  };

  return (
    <DropdownMenu
      slots={{ content: { className: 'z-50', align: 'end' } }}
      trigger={
        <div className='flex'>
          <Button variant='ghost' className='p-0'>
            <DotsThreeCircle className={getSize(6)} />
          </Button>
        </div>
      }
    >
      {actions?.map((action, i) => (
        <div key={i}>
          {i > 0 && <DropdownMenuSeparator />}
          {action?.map((action, i) => {
            const { label, Icon } = action;
            return (
              <DropdownMenuItem key={i} onClick={() => handleAction(action)}>
                <Icon className={getSize(5)} />
                <span className='mis-2'>{label}</span>
              </DropdownMenuItem>
            );
          })}
        </div>
      ))}
    </DropdownMenu>
  );
};
