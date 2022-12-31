//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { MemberList } from 'packages/experimental/kai/src/containers/MemberList';
import { AirplaneInFlight, AirplaneTakeoff, Bug, PlusCircle, Gear } from 'phosphor-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';
import { SpaceList } from './SpaceList';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();
  const { state: connectionState } = useNetworkStatus();

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleAirplaneMode = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.setConnectionState(ConnectionState.ONLINE);
        break;
      }
      case ConnectionState.ONLINE: {
        await client.mesh.setConnectionState(ConnectionState.OFFLINE);
        break;
      }
    }
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
        <MemberList spaceKey={space.key} />
      </div>

      <div className='flex flex-shrink-0 p-3 mt-2'>
        <button className='mr-2'>
          <Gear className={getSize(6)} />
        </button>
        <button className='mr-2' title='Reset store.' onClick={handleAirplaneMode}>
          {connectionState === ConnectionState.ONLINE ? (
            <AirplaneTakeoff className={getSize(6)} />
          ) : (
            <AirplaneInFlight className={getSize(6)} />
          )}
        </button>
      </div>
    </div>
  );
};
