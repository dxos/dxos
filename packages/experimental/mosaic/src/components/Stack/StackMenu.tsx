//
// Copyright 2022 DXOS.org
//

import { DotsThreeCircle } from '@phosphor-icons/react';
import React, { FC, useContext } from 'react';

import { Button, getSize } from '@dxos/aurora';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@dxos/react-appkit';

import { StackSectionContext } from './context';

export type StackAction = {
  id: string;
  label: string;
  Icon: FC<any>;
};

export type StackMenuProps = {
  actions?: StackAction[][];
  onAction?: (action: StackAction, section?: any) => void; // TODO(burdon): Type.
};

export const StackAction = ({
  action,
  onAction
}: {
  action: StackAction;
  onAction?: (action: StackAction, section?: any) => void;
}) => {
  const { section } = useContext(StackSectionContext);
  const { Icon } = action;

  return (
    <Button variant='ghost' onClick={() => onAction?.(action, section)}>
      <Icon />
    </Button>
  );
};

export const StackMenu = ({ actions = [], onAction }: StackMenuProps) => {
  const { section } = useContext(StackSectionContext);
  const handleAction = (action: StackAction) => {
    onAction?.(action, section);
  };

  return (
    <DropdownMenu
      slots={{ content: { className: 'z-50', align: 'end' } }}
      trigger={
        <div className='flex'>
          <Button variant='ghost' density='fine' className='p-0'>
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
