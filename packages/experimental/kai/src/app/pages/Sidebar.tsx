//
// Copyright 2022 DXOS.org
//

import { PlusCircle, Gear, Robot, Trash, WifiHigh, WifiSlash, UserPlus } from 'phosphor-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { getSize, mx, ThemeContext, Button as NaturalButton } from '@dxos/react-components';
import { InvitationListContainer, PanelSeparator, SpaceMemberListContainer } from '@dxos/react-ui';

import { Button } from '../../components';
import { SpaceList } from '../../containers';
import { useSpace } from '../../hooks';
import { Generator } from '../../proto';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();
  const { state: connectionState } = useNetworkStatus();
  const generator = useMemo(() => (space ? new Generator(space.experimental.db) : undefined), [space]);

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

  const handleReset = async () => {
    await client.reset();
    await client.initialize();
    // TODO(burdon): Hangs (no error) if profile not created?
    if (!client.halo.profile) {
      await client.halo.createProfile();
    }
    location.reload(); // TODO(mykola): Client is not re-entrant after reset.
  };

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
    <div className='flex grow flex-col gap-2 overflow-auto min-bs-full'>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        {/* Spaces */}
        <div className='flex flex-shrink-0 flex-col overflow-y-scroll'>
          <SpaceList />
          <div className='p-3'>
            <Button className='flex' title='Create new space' onClick={handleCreateSpace}>
              <PlusCircle className={getSize(6)} />
            </Button>
          </div>
        </div>

        <div role='none' className='grow' />

        <div role='none' className='pli-2'>
          <InvitationListContainer spaceKey={space.key} />
          <PanelSeparator />
          <NaturalButton compact className='is-full flex gap-2'>
            <span>Invite</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </NaturalButton>
          <PanelSeparator />
          <SpaceMemberListContainer spaceKey={space.key} includeSelf />
          <PanelSeparator />
        </div>

        {/* Footer */}
        <div className='flex shrink-0 justify-center gap-2 pli-2 pbe-2'>
          <Button title='Settings' onClick={handleSettings}>
            <Gear className={getSize(6)} />
          </Button>
          <Button title='Generate data' onClick={handleGenerateData}>
            <Robot className={getSize(6)} />
          </Button>
          <Button title='Reset store' onClick={handleReset}>
            <Trash className={getSize(6)} />
          </Button>
          <Button title='Toggle connection.' onClick={handleToggleConnection}>
            {connectionState === ConnectionState.ONLINE ? (
              <WifiHigh className={getSize(6)} />
            ) : (
              <WifiSlash className={mx(getSize(6), 'text-orange-500')} />
            )}
          </Button>
        </div>
      </ThemeContext.Provider>
    </div>
  );
};
