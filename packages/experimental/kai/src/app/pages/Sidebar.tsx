//
// Copyright 2022 DXOS.org
//

import { PlusCircle, Gear, Robot, Trash, WifiHigh, WifiSlash, UserPlus } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useHref, useNavigate } from 'react-router-dom';

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

  const joinPath = useHref('/join');
  const createInvitationUrl = (invitationCode: string) =>
    `${document.defaultView?.origin}/${joinPath}/${invitationCode}`;

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

  const handleCreateInvitation = useCallback(() => {
    console.log('[handle create invitation]', space);
    space.createInvitation();
  }, [space]);

  return (
    <div className='flex flex-col min-bs-full max-bs-full'>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        {/* Spaces */}
        <div className='shrink flex flex-col overflow-y-auto'>
          <SpaceList />
        </div>
        <Button className='flex m-2' title='Create new space' onClick={handleCreateSpace}>
          <PlusCircle className={getSize(6)} />
        </Button>

        <div role='none' className='grow' />

        <div role='none' className='shrink pli-2 overflow-y-auto'>
          <InvitationListContainer spaceKey={space.key} {...{ createInvitationUrl }} />
        </div>
        <PanelSeparator className='mli-2' />
        <div role='none' className='mli-2'>
          <NaturalButton compact className='flex gap-2 is-full' onClick={handleCreateInvitation}>
            <span>Invite</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </NaturalButton>
        </div>
        <PanelSeparator className='mli-2' />
        <div role='none' className='shrink pli-2 overflow-y-auto'>
          <SpaceMemberListContainer spaceKey={space.key} includeSelf />
        </div>
        <PanelSeparator className='mli-2' />

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
