//
// Copyright 2022 DXOS.org
//

import { Bug, List, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { useTogglePanelSidebar } from '@dxos/react-ui';

export const Menu = () => {
  return (
    <Link to='/identity'>
      <User className={getSize(6)} />
    </Link>
  );
};

export const AppBar = () => {
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <div className='flex items-center pl-4 pr-4' style={{ height: 48 }}>
      <div className='flex'>
        <button onClick={toggleSidebar}>
          <List className={getSize(6)} />
        </button>
      </div>

      <div className='flex items-center ml-4'>
        <Bug className={mx('logo', getSize(8))} />
        <div className='ml-1'>KAI</div>
      </div>

      <div className='flex-1' />
      <Menu />
    </div>
  );
};
