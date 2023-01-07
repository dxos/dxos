//
// Copyright 2022 DXOS.org
//

import { Bug, PlusCircle, Gear, Robot, Trash, WifiHigh, WifiSlash } from 'phosphor-react';
import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button } from '../components';
import { useOptions, useSpace, viewConfig } from '../hooks';
import { Generator } from '../proto';
import { MemberList } from './MemberList';
import { SpaceList } from './SpaceList';

export const Sidebar = () => {
  const { views } = useOptions();
  const navigate = useNavigate();
  const { spaceKey: currentSpaceKey, view: currentView } = useParams();
  const client = useClient();
  const { space } = useSpace();
  const { state: connectionState } = useNetworkStatus();
  const generator = useMemo(() => (space ? new Generator(space.experimental.db) : undefined), [space]);

  const setView = (spaceKey: string, view: string) => {
    navigate(`/${spaceKey}/${view}`);
  };

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleGenerateData = async () => {
    await generator?.generate();
  };

  // TODO(burdon): Clear database.
  const handleReset = () => {};

  const handleToggleConnection = async () => {
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
      {/* Header */}
      <div className='flex flex-shrink-0 p-3 mb-2'>
        <div className='flex flex-1 items-center'>
          <Bug className={mx('logo', getSize(8))} />
          <div className='flex-1'></div>
          <Button className='flex' title='Create new space' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </Button>
        </div>
      </div>

      {/* Views */}
      {views.length > 1 && (
        <div className='flex p-3 mb-2'>
          {views.map((view) => {
            const { Icon } = viewConfig[view];
            return (
              <Button key={view} className='mr-2' onClick={() => setView(currentSpaceKey!, view)}>
                <Icon className={mx(getSize(6), view !== currentView && 'text-gray-500')} />
              </Button>
            );
          })}
        </div>
      )}

      {/* Spaces */}
      <div className='flex flex-shrink-0 flex-col overflow-y-scroll'>
        <SpaceList />
      </div>

      <div className='flex flex-1'></div>

      {/* Members */}
      <div className='flex flex-col flex-shrink-0 mt-6'>
        <div className='flex p-1 pl-3 mb-2 text-gray-300 text-xs'>Members</div>
        <div className='flex flex-shrink-0 pl-3'>
          <MemberList spaceKey={space.key} />
        </div>
      </div>

      {/* Footer */}
      <div className='flex flex-shrink-0 p-3 mt-2'>
        <Button className='mr-2' title='Settings' onClick={handleSettings}>
          <Gear className={getSize(6)} />
        </Button>
        <Button className='mr-2' title='Generate data' onClick={handleGenerateData}>
          <Robot className={getSize(6)} />
        </Button>
        <Button className='mr-2' title='Reset store' onClick={handleReset}>
          <Trash className={getSize(6)} />
        </Button>
        <Button className='mr-2' title='Toggle connection.' onClick={handleToggleConnection}>
          {connectionState === ConnectionState.ONLINE ? (
            <WifiHigh className={getSize(6)} />
          ) : (
            <WifiSlash className={mx(getSize(6), 'text-orange-500')} />
          )}
        </Button>
      </div>
    </div>
  );
};
