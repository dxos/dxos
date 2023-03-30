//
// Copyright 2022 DXOS.org
//

import { PlusCircle, Trash } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { Button, Dialog, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, getSize } from '@dxos/react-components';

export type SelectorComponent = FC<{ onSelect: (objectId: string | undefined) => void }>;

export type ContextMenuItem = {
  type: string;
  label: string;
  Icon: FC<any>;
  Selector?: SelectorComponent;
};

export type ContextMenuProps = {
  items?: ContextMenuItem[];
  onOpenChange: (open: boolean) => void;
  onInsert?: (item: ContextMenuItem, objectId?: string) => void;
  onDelete?: () => void;
};

export const ContextMenu = ({ items, onOpenChange, onInsert, onDelete }: ContextMenuProps) => {
  const [itemSelector, setItemSelector] = useState<ContextMenuItem>();
  const { Selector } = itemSelector ?? {};

  const handleClick = (item: ContextMenuItem) => {
    if (item.Selector) {
      setItemSelector(item);
    } else {
      onInsert?.(item);
    }
  };

  return (
    <>
      <DropdownMenu
        slots={{ root: { onOpenChange }, content: { className: 'z-50' } }}
        trigger={
          <Button variant='ghost' className='p-1'>
            <PlusCircle className={getSize(6)} />
          </Button>
        }
      >
        {onInsert && (
          <>
            {items?.map((item) => {
              const { type, label, Icon } = item;
              return (
                <DropdownMenuItem key={type} onClick={() => handleClick(item)}>
                  <Icon className={getSize(5)} />
                  <span className='mis-2'>{label}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete}>
              <Trash className={getSize(5)} />
              <span className='mis-2'>Remove section</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>

      {/* TODO(burdon): Generalize selectors. */}
      <Dialog title='Select image' open={!!Selector}>
        {/* TODO(burdon): Filter by image. */}
        <div className='mt-4'>
          {Selector && (
            <Selector
              onSelect={(objectId: string | undefined) => {
                setItemSelector(undefined);
                if (objectId) {
                  onInsert?.(itemSelector!, objectId);
                }
              }}
            />
          )}
        </div>
        <div className='flex flex-row-reverse'>
          <Button variant='primary' onClick={() => setItemSelector(undefined)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
};
