//
// Copyright 2022 DXOS.org
//

import { DotsThreeCircle } from '@phosphor-icons/react';
import React, { type FC, useContext } from 'react';

import { Button, DropdownMenu } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant='ghost' density='fine' classNames='p-0'>
            <DotsThreeCircle className={getSize(6)} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align='end' classNames='z-50'>
            <DropdownMenu.Viewport>
              {actions?.map((action, i) => (
                <div key={i}>
                  {i > 0 && <DropdownMenu.Separator />}
                  {action?.map((action, i) => {
                    const { label, Icon } = action;
                    return (
                      <DropdownMenu.Item key={i} onClick={() => handleAction(action)}>
                        <Icon className={getSize(5)} />
                        <span className='mis-2'>{label}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                </div>
              ))}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
