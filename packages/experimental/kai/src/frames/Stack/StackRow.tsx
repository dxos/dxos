//
// Copyright 2022 DXOS.org
//

import { DotsSixVertical, Plus, Trash } from 'phosphor-react';
import React, { FC, ReactNode } from 'react';

import { Button, DropdownMenu, DropdownMenuItem, getSize, mx } from '@dxos/react-components';

export const StackRow: FC<{
  children?: ReactNode;
  className?: string;
  showMenu?: boolean;
  onCreate?: () => void;
  onDelete?: () => void;
}> = ({ children, showMenu, className, onCreate, onDelete }) => {
  return (
    <div className={mx('group flex mx-6 md:mx-0 py-4', className)}>
      <div className='hidden md:flex w-24 text-gray-400'>
        {showMenu && (
          <div className='flex ml-6 invisible group-hover:visible'>
            <div>
              <DropdownMenu
                trigger={
                  <Button variant='ghost' className='p-1' onClick={onCreate}>
                    <Plus className={getSize(4)} />
                  </Button>
                }
                slots={{ content: { className: 'z-50' } }}
              >
                {onCreate && (
                  <DropdownMenuItem onClick={onCreate}>
                    <Plus className={getSize(5)} />
                    <span className='mis-2'>Insert section</span>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete}>
                    <Trash className={getSize(5)} />
                    <span className='mis-2'>Remove section</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            </div>
            <div className='p-1 cursor-pointer'>
              <DotsSixVertical className={getSize(6)} />
            </div>
          </div>
        )}
      </div>
      <div className='flex flex-1 mr-2 md:mr-16'>{children}</div>
    </div>
  );
};
