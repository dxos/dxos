//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { useConfig } from '@dxos/react-client';
import { DXOS } from '@dxos/react-icons';
import { List, ListItem } from '@dxos/react-ui';

import { Toolbar } from './Toolbar';
import { ListItemButton, ListItemText } from './util';
import { type Module } from '../hooks';

export type SidebarProps = {
  modules: Module[];
  active: string;
  onActiveChange: (module: string) => void;
};

export const Sidebar = ({ modules, active, onActiveChange }: SidebarProps) => {
  const config = useConfig();
  const version = config.values?.runtime?.app?.build?.version;

  return (
    <div className='flex flex-col h-full space-y-4 bg-sidebar-bg dark:bg-dark-sidebar-bg'>
      <Toolbar>
        <div className='flex p-2 items-center space-x-2'>
          <Link to='/'>
            <DXOS className='w-[32px] h-[32px] stroke-white' />
          </Link>
          <div className='text-xl font-thin'>CONSOLE</div>
        </div>
      </Toolbar>

      <List aria-labelledby='modules'>
        {modules.map(({ id, label, Icon }) => (
          <ListItemButton key={id} selected={id === active} onClick={() => onActiveChange(id)}>
            <ListItem.Endcap asChild>
              <Icon />
            </ListItem.Endcap>
            <ListItemText className='font-thin'>{label}</ListItemText>
          </ListItemButton>
        ))}
      </List>

      <div className='grow' />
      <div className='flex px-4 py-2 text-sm font-mono'>{version}</div>
    </div>
  );
};
