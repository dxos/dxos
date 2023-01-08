//
// Copyright 2022 DXOS.org
//

import { Bug, List, User } from 'phosphor-react';
import React, { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { AppView, useAppStateDispatch, useOptions, viewConfig } from '../../hooks';

export const Menu = () => {
  return (
    <button>
      <User className={getSize(6)} />
    </button>
  );
};

// TODO(burdon): Change view type from string to AppView.
export const ViewSelector: FC<{ views: AppView[]; view?: string; onChange: (view: AppView) => void }> = ({
  views,
  view: currentView,
  onChange
}) => {
  return (
    <div className='flex items-center'>
      {views.map((view) => {
        const { Icon } = viewConfig[view];
        return (
          <a
            key={view}
            className={mx(
              'flex p-1 pl-2 pr-2 mr-2 items-center cursor-pointer rounded-t text-black text-sm',
              view === currentView && 'bg-white'
            )}
            onClick={() => onChange(view)}
          >
            <Icon weight='light' className={getSize(6)} />
            <div className={mx('pl-1 pr-1', view === currentView && 'bg-gray-50')}>{String(view)}</div>
          </a>
        );
      })}
    </div>
  );
};

export const AppBar = () => {
  const { views } = useOptions();
  const navigate = useNavigate();
  const { spaceKey: currentSpaceKey, view: currentView } = useParams();
  const setAppState = useAppStateDispatch();

  const setView = (spaceKey: string, view: string) => {
    navigate(`/${spaceKey}/${view}`);
  };

  return (
    <div className='flex flex-col flex-shrink-0'>
      <div className='flex items-center bg-orange-400 pl-2 pr-2' style={{ height: 48 }}>
        <div className='flex ml-2'>
          <button onClick={() => setAppState(({ showSidebar, ...rest }) => ({ showSidebar: !showSidebar, ...rest }))}>
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

      {views.length > 1 && (
        <div className='flex flex-1 items-center bg-orange-500 pt-1 pl-2 pr-2'>
          <ViewSelector
            view={currentView}
            views={views}
            onChange={(view: AppView) => setView(currentSpaceKey!, view)}
          />
        </div>
      )}
    </div>
  );
};
