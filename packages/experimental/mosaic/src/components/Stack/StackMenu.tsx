//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from '@phosphor-icons/react';
import React, { FC, useContext, useState } from 'react';

import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, getSize } from '@dxos/react-components';

import { StackSectionContext } from './context';

export type SelectorComponent = FC<{ onSelect: (objectId: string | undefined) => void }>;

export type StackMenuItem = {
  action: 'insert' | 'delete';
  label: string;
  Icon: FC<any>;
  Selector?: SelectorComponent;
  onCreate?: () => any; // TODO(burdon): Type.
};

export type StackMenuProps = {
  items?: StackMenuItem[][];
  onChange?: (open: boolean) => void;
  onSelect?: (item: StackMenuItem, section?: any) => void; // TODO(burdon): Type.
};

// TODO(burdon): Generalize action: Create, Select, Delete.

export const StackMenu = ({ items = [], onChange, onSelect }: StackMenuProps) => {
  const [Selector, setSelector] = useState<SelectorComponent>();
  const { section } = useContext(StackSectionContext);
  const handleSelect = (item: StackMenuItem) => {
    if (item.Selector) {
      setSelector(item.Selector);
    } else {
      onSelect?.(item, section);
    }
  };

  return (
    <>
      {Selector && <Selector onSelect={() => onSelect?.()} />}

      <DropdownMenu
        slots={{ root: { onOpenChange: onChange }, content: { className: 'z-50', align: 'end' } }}
        trigger={
          <div className='flex'>
            <Button variant='ghost' className='p-0'>
              <PlusCircle className={getSize(6)} />
            </Button>
          </div>
        }
      >
        {items?.map((items, i) => (
          <div key={i}>
            {i > 0 && <DropdownMenuSeparator />}
            {items?.map((item, i) => {
              const { label, Icon } = item;
              return (
                <DropdownMenuItem key={i} onClick={() => handleSelect(item)}>
                  <Icon className={getSize(5)} />
                  <span className='mis-2'>{label}</span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenu>
    </>
  );
};
