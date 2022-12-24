//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { AirplaneInFlight, AirplaneTakeoff, Bug, PlusCircle } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';
import { MembersList } from './MembersList';
import { SpaceList } from './SpaceList';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();
  const [airplaneMode, setAirplaneMode] = useState(false);

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleAirplaneMode = () => {
    setAirplaneMode((mode) => !mode);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-slate-700 text-white'>
      <div className='flex flex-shrink-0 p-3 mb-2'>
        <div className='flex flex-1 items-center'>
          <Bug className={clsx('logo', getSize(8))} />
          <div className='flex-1'></div>
          <button className='flex' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex flex-1 flex-col overflow-y-scroll'>
        <SpaceList />
      </div>

      <div className='flex flex-shrink-0 p-3 mt-6'>
        <MembersList spaceKey={space.key} />
      </div>

      <div className='flex flex-shrink-0 p-3 mt-2'>
        <button title='Reset store.' onClick={handleAirplaneMode}>
          {airplaneMode ? <AirplaneTakeoff className={getSize(6)} /> : <AirplaneInFlight className={getSize(6)} />}
        </button>
      </div>
    </div>
  );
};
