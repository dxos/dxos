//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { useConfig } from '@dxos/react-client';
import { List, ListItemEndcap } from '@dxos/react-components';

import { Logo } from '../components';
import { Module } from '../hooks';
import { ListItemButton, ListItemText } from './util';

export type SidebarProps = {
  modules: Module[];
  active: string;
  onActiveChange: (module: string) => void;
};

// TODO(burdon): Theme colors?
export const Sidebar = ({ modules, active, onActiveChange }: SidebarProps) => {
  const config = useConfig();
  const version = config.values?.runtime?.app?.build?.version;

  return (
    <div className='flex flex-col h-full space-y-4 bg-zinc-800'>
      <div className='flex p-2 items-center space-x-2'>
        <Link to='/'>
          <Logo className='w-[32px] h-[32px]' />
        </Link>
        <div className='text-xl font-thin'>CONSOLE</div>
      </div>
      <List labelId='modules'>
        {modules.map(({ id, label, Icon }) => (
          <ListItemButton key={id} selected={id === active} onClick={() => onActiveChange(id)}>
            <ListItemEndcap asChild>
              <Icon />
            </ListItemEndcap>
            <ListItemText className='font-thin'>{label}</ListItemText>
          </ListItemButton>
        ))}
      </List>
      <div className='grow' />
      <div className='p-2 text-sm'>{version}</div>
    </div>
  );
};
