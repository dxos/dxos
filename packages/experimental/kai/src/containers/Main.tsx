//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { Bug, ShareNetwork, PlusCircle, Trash } from 'phosphor-react';
import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link, useHref, useNavigate, useParams } from 'react-router-dom';

import { useClient, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';
import { ContactList } from './ContactList';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { TaskList } from './TaskList';

const Sidebar = () => {
  const client = useClient();
  const spaces = useSpaces();
  const { space } = useSpace();
  const navigate = useNavigate();
  const { spaceKey: currentSpaceKey } = useParams();
  const url = useHref(`/join/${space.key.toHex()}`);

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleReset = () => {
    console.log('reset');
  };

  return (
    <div className='flex flex-1 flex-col bg-slate-700 text-white'>
      <div className='flex p-3 mb-2'>
        <div className='flex flex-1 items-center'>
          <Bug className={getSize(8)} style={{ transform: 'rotate(300deg)' }} />
          <div className='flex-1'></div>
          <button className='flex' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex flex-1 flex-col font-mono cursor-pointer'>
        {spaces.map((space) => (
          <div
            key={space.key.toHex()}
            className={clsx('flex p-2 pl-4 pr-4', space.key.truncate() === currentSpaceKey && 'bg-slate-600')}
          >
            <div className='flex flex-1'>
              <Link to={`/${space.key.truncate()}`}>{space.key.truncate()}</Link>
            </div>
            {space.key.truncate() === currentSpaceKey && (
              <div className='flex items-center'>
                <CopyToClipboard text={window.origin + '/' + url}>
                  <ShareNetwork className={clsx(getSize(5), 'cursor-pointer')} />
                </CopyToClipboard>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='flex p-3 mt-2'>
        <button title='Reset store.' onClick={handleReset}>
          <Trash className={getSize(6)} />
        </button>
      </div>
    </div>
  );
};

export const Main = () => {
  const columnWidth = 300;
  const sidebarWidth = 200;

  return (
    <div className='full-screen'>
      <div className='flex' style={{ width: sidebarWidth }}>
        <Sidebar />
      </div>
      <div className='flex flex-1 overflow-x-scroll'>
        <div className='flex m-2'>
          <div className='flex m-2' style={{ width: columnWidth }}>
            <ProjectList />
          </div>

          <div className='flex m-2' style={{ width: columnWidth }}>
            <ContactList />
          </div>

          <div className='flex flex-col m-2' style={{ width: columnWidth }}>
            <div className='flex flex-1 flex-shrink-0 mb-4 overflow-hidden'>
              <TaskList />
            </div>
            <div className='flex flex-1 flex-shrink-0 overflow-hidden'>
              <TaskList completed={true} readonly />
            </div>
          </div>

          <div className='flex flex-1 m-2' style={{ width: (columnWidth * 3) / 2 }}>
            <ProjectGraph />
          </div>
        </div>
      </div>
    </div>
  );
};
