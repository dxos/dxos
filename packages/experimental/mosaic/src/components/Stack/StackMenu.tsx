//
// Copyright 2022 DXOS.org
//

import { DotsThreeCircle } from '@phosphor-icons/react';
import React, { FC, useContext } from 'react';

import {
  Button,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

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
  onAction,
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
    <div className='flex'>
      <DropdownMenuRoot>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' density='fine' classNames='p-0'>
            <DotsThreeCircle className={getSize(6)} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align='end' classNames='z-50'>
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
            <DropdownMenuArrow />
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  );
};
