//
// Copyright 2023 DXOS.org
//

import { HouseLine } from '@phosphor-icons/react';
import React, { FC, PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { Button, getSize, List, ListItem, ListItemEndcap, ListItemProps, mx } from '@dxos/react-components';

import { Module } from '../hooks';
import { Toolbar } from './Toolbar';

export type SidebarProps = {
  modules: Module[];
  active: string;
  onActiveChange: (module: string) => void;
};

// TODO(burdon): Theme colors?
export const Sidebar = ({ modules, active, onActiveChange }: SidebarProps) => {
  return (
    <div className='flex flex-col flex-1 h-full bg-zinc-800 space-y-4'>
      <Toolbar>
        <Button>
          <Link to='/'>
            <HouseLine className={getSize(5)} />
          </Link>
        </Button>
      </Toolbar>
      <List labelId='modules'>
        {modules.map(({ id, label, Icon }) => (
          <ListItemButton key={id} selected={id === active} onClick={() => onActiveChange(id)}>
            <ListItemEndcap asChild>
              <Icon />
            </ListItemEndcap>
            <ListItemText>{label}</ListItemText>
          </ListItemButton>
        ))}
      </List>
    </div>
  );
};

export type ListItemButtonProps = ListItemProps & {
  slots?: any;
  onClick?: () => void;
};

export const ListItemButton = ({ slots, onClick, selected, ...rest }: ListItemButtonProps) => {
  return (
    <ListItem
      slots={{
        // TODO(burdon): How to deal with colors?
        root: { className: mx('px-2 py-1', selected && 'bg-zinc-600') },
        mainContent: { className: 'flex items-center overflow-hidden cursor-pointer', onClick },
        ...slots
      }}
      {...rest}
    />
  );
};

export const ListItemText: FC<PropsWithChildren> = ({ children }) => (
  <div className='w-full px-1 truncate'>{children}</div>
);
