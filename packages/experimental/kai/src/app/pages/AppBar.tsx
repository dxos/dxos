//
// Copyright 2022 DXOS.org
//

import { Bug, List, User } from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getSize, mx, useMediaQuery } from '@dxos/react-components';
import { PanelSidebarContext, sidebarWidth, useTogglePanelSidebar } from '@dxos/react-ui';

import { useOptions, viewConfig } from '../../hooks';

export const Menu = () => {
  return (
    <button>
      <User className={getSize(6)} />
    </button>
  );
};

export const AppBar = () => {
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <div className='flex items-center pl-2 pr-2' style={{ height: 48 }}>
      <div className='flex ml-2'>
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

// TODO(burdon): Collapse tabs into hamburger if narrow.
export const ViewSelector: FC = () => {
  const navigate = useNavigate();
  const { views } = useOptions();
  const { spaceKey: currentSpaceKey, view: currentView } = useParams();
  const { displayState } = useContext(PanelSidebarContext); // TODO(burdon): Context lags.
  const isOpen = displayState === 'show';
  const [isLg] = useMediaQuery('lg');

  const setView = (spaceKey: string, view: string) => {
    navigate(`/${spaceKey}/${view}`);
  };

  return (
    <div
      className={mx(
        'flex flex-col flex-1 bg-orange-500 pt-1 fixed inline-end-0 block-start-[48px] z-[1] transition-[inset-inline-start] duration-200 ease-in-out',
        isLg && isOpen ? `inline-start-[${sidebarWidth}px]` : 'inline-start-0'
      )}
    >
      <div className='flex pl-2'>
        {views.map((view) => {
          const { Icon } = viewConfig[view];
          return (
            <a
              key={view}
              className={mx(
                'flex p-1 pl-2 pr-2 mr-2 items-center cursor-pointer rounded-t text-black text-sm',
                view === currentView && 'bg-white'
              )}
              onClick={() => setView(currentSpaceKey!, view)}
            >
              <Icon weight='light' className={getSize(6)} />
              <div className='ml-1'>{String(view)}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
