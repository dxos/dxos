//
// Copyright 2023 DXOS.org
//

import { HouseLine } from '@phosphor-icons/react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Button, getSize, List, ListItemEndcap } from '@dxos/react-components';

import { Module } from '../hooks';
import { Toolbar } from './Toolbar';
import { ListItemButton, ListItemText } from './util';

export type SidebarProps = {
  modules: Module[];
  active: string;
  onActiveChange: (module: string) => void;
};

// TODO(burdon): Theme colors?
export const Sidebar = ({ modules, active, onActiveChange }: SidebarProps) => {
  return (
    <div className='flex flex-col h-full space-y-4 bg-zinc-800'>
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
