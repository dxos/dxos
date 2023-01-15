//
// Copyright 2022 DXOS.org
//

import React, { FC, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getSize, mx, useMediaQuery } from '@dxos/react-components';
import { PanelSidebarContext } from '@dxos/react-ui';

import { useOptions } from '../hooks';
import { viewConfig } from './views';

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
        isLg && isOpen ? 'inline-start-[272px]' : 'inline-start-0'
      )}
    >
      <div className='flex pl-2'>
        {views.map((view) => {
          const { Icon } = viewConfig[view];
          return (
            <a
              key={view}
              className={mx(
                'flex p-1 pl-2 lg:pr-2 lg:mr-2 items-center cursor-pointer rounded-t text-black text-sm',
                view === currentView && 'bg-white'
              )}
              onClick={() => setView(currentSpaceKey!, view)}
            >
              <Icon weight='light' className={getSize(6)} />
              <div className='hidden lg:flex ml-1'>{String(view)}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
