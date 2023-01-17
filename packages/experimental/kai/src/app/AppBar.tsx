//
// Copyright 2022 DXOS.org
//

import { Bug, Globe, List, User } from 'phosphor-react';
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

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
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';

  return (
    <div
      className={mx(
        'flex items-center pl-4 pr-4 fixed inline-end-0 block-start-0 bg-orange-400 transition-[inset-inline-start] duration-200 ease-in-out',
        isOpen ? 'inline-start-0 lg:inline-start-[272px]' : 'inline-start-0'
      )}
      style={{ height: 48 }}
    >
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
