//
// Copyright 2023 DXOS.org
//

import { HouseLine } from '@phosphor-icons/react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Button, getSize, List, ListItem, ListItemEndcap, mx } from '@dxos/react-components';

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
    <div className='flex flex-col flex-1 h-full bg-zinc-800'>
      <Toolbar>
        <Button>
          <Link to='/'>
            <HouseLine className={getSize(5)} />
          </Link>
        </Button>
      </Toolbar>
      <div className='mt-4'>
        {/* TODO(burdon): Remove all custom classes from List; incl. making label full width; cursor pointer, etc. */}
        <List labelId='modules'>
          {modules.map(({ id, label, Icon }) => (
            <ListItem
              key={id}
              // TODO(burdon): Key class from selected.
              slots={{ root: { className: mx('px-2', id === active && 'bg-zinc-600') } }}
              selected={id === active}
              onSelectedChange={() => {
                console.log('!!!');
              }}
            >
              <ListItemEndcap asChild>
                <Icon />
              </ListItemEndcap>
              <div onClick={() => onActiveChange(id)}>{label}</div>
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  );
};
