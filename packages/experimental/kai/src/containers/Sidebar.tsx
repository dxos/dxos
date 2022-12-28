//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { AirplaneInFlight, AirplaneTakeoff, Bug, PlusCircle, Gear } from 'phosphor-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { NetworkMode } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';
import { MembersList } from './MembersList';
import { SpaceList } from './SpaceList';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();
  // const networkMode = useNetworkMode();
  const networkMode = undefined;

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleAirplaneMode = async () => {
    let newMode: NetworkMode | undefined;
    // switch (networkMode?.mode) {
    //   case NetworkMode.OFFLINE: {
    //     newMode = NetworkMode.ONLINE;
    //     break;
    //   }
    //   case NetworkMode.ONLINE: {
    //     newMode = NetworkMode.OFFLINE;
    //     break;
    //   }
    // }

    if (!newMode) {
      return;
    }

    await client.setNetworkMode(newMode);
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
        <button className='mr-2'>
          <Gear className={getSize(6)} />
        </button>
        <button className='mr-2' title='Reset store.' onClick={handleAirplaneMode}>
          {networkMode?.mode === NetworkMode.ONLINE ? (
            <AirplaneTakeoff className={getSize(6)} />
          ) : (
            <AirplaneInFlight className={getSize(6)} />
          )}
        </button>
      </div>
    </div>
  );
};
