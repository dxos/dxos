//
// Copyright 2022 DXOS.org
//

import { Bug, Globe, List, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { useTogglePanelSidebar } from '@dxos/react-ui';

import { FrameID } from '../hooks';

export const Menu = () => {
  return (
    <div className='flex items-center'>
      <Link className='ml-2' to={FrameID.DMG} title='DMG'>
        <Globe className={getSize(6)} />
      </Link>
      <Link className='ml-2' to='/identity' title='Identity'>
        <User className={getSize(6)} />
      </Link>
    </div>
  );
};

export const AppBar = () => {
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <div className='flex items-center pl-4 pr-4 fixed inline-start-0 inline-end-0 block-start-0 bs-[48px] bg-orange-400 z-[1]'>
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
