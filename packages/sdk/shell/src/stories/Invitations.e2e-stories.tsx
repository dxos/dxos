//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Laptop, Planet, Plus, PlusCircle, SignIn, QrCode, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space, type SpaceMember, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';
import { useMultiClient, withMultiClientProvider } from '@dxos/react-client/testing';
import { Button, ButtonGroup, Clipboard, List } from '@dxos/react-ui';
import { getSize, activeSurface } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IdentityListItem, SpaceListItem } from '../components';
import { IdentityPanel, JoinPanel, SpacePanel } from '../panels';
import { translations } from '../translations';

export default {
  title: 'sdk/shell/Invitations',
};

export type PanelType = Space | 'identity' | 'devices' | 'join';

const createInvitationUrl = (invitation: string) => invitation;

const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setPanel: (panel?: PanelType) => void }) => {
  const client = useClient();
  const spaces = useSpaces();

  useMemo(() => {
    if (panel && typeof panel !== 'string') {
      (window as any)[`peer${id}CreateSpaceInvitation`] = (options?: Partial<Invitation>) => {
        const invitation = panel.share(options);

        invitation.subscribe((invitation) => {
          const invitationCode = InvitationEncoder.encode(invitation);
          if (invitation.state === Invitation.State.CONNECTING) {
            log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
          }
        });
      };
    }
  }, [panel]);

  if (panel && typeof panel !== 'string') {
    return <SpacePanel space={panel} createInvitationUrl={createInvitationUrl} />;
  }

  switch (panel) {
    case 'identity': {
      return <JoinPanel mode='halo-only' onDone={() => setPanel(undefined)} onExit={() => setPanel(undefined)} />;
    }

    case 'devices': {
      return <IdentityPanel createInvitationUrl={createInvitationUrl} onDone={() => setPanel(undefined)} />;
    }

    case 'join': {
      return <JoinPanel onDone={() => setPanel(undefined)} onExit={() => setPanel(undefined)} />;
    }

    default: {
      // TODO(wittjosiah): Tooltips make playwright (webkit) flakier.
      const controls = (
        <ButtonGroup classNames='mbe-4'>
          {/* <Tooltip content='Create Space'> */}
          <Button
            onClick={() => client.spaces.create({ name: faker.commerce.productName() })}
            data-testid='invitations.create-space'
          >
            <PlusCircle className={getSize(6)} />
          </Button>
          {/* </Tooltip>
          <Tooltip content='Join Space'> */}
          <Button onClick={() => setPanel('join')} data-testid='invitations.open-join-space'>
            <SignIn weight='fill' className={getSize(6)} />
          </Button>
          {/* </Tooltip> */}
        </ButtonGroup>
      );

      const header = (
        <div className='flex'>
          Spaces
          <span className='grow' />
          {controls}
        </div>
      );

      return (
        <div>
          <h1>{header}</h1>
          {spaces.length > 0 ? (
            <List>
              {spaces.map((space) => (
                <SpaceListItem key={space.key.toHex()} space={space} onClick={() => setPanel(space)} />
              ))}
            </List>
          ) : (
            <div className='text-center'>No spaces</div>
          )}
        </div>
      );
    }
  }
};

const Invitations = () => {
  const { id } = useMultiClient();
  const client = useClient();
  const networkStatus = useNetworkStatus().swarm;
  const identity = useIdentity();
  const [panel, setPanel] = useState<PanelType>();

  useMemo(() => {
    (window as any)[`peer${id}CreateHaloInvitation`] = (options?: Partial<Invitation>) => {
      const invitation = client.halo.share(options);

      invitation.subscribe((invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        if (invitation.state === Invitation.State.CONNECTING) {
          log.info(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
        }
      });
    };
  }, [client]);

  // TODO(wittjosiah): Tooltips make playwright (webkit) flakier.
  const controls = (
    <ButtonGroup classNames='mbe-4'>
      {/* <Tooltip content='Create Identity'> */}
      <Button
        onClick={() => client.halo.createIdentity({ displayName: faker.person.firstName() })}
        disabled={Boolean(identity)}
        data-testid='invitations.create-identity'
      >
        <Plus className={getSize(6)} />
      </Button>
      {/* </Tooltip>
      <Tooltip content='Join Existing Identity'> */}
      <Button
        onClick={() => setPanel('identity')}
        disabled={panel === 'identity'}
        data-testid='invitations.open-join-identity'
      >
        <QrCode weight='fill' className={getSize(6)} />
      </Button>
      {/* </Tooltip>
      <Tooltip content='Devices'> */}
      <Button
        onClick={() => setPanel('devices')}
        disabled={!identity || panel === 'devices'}
        data-testid='invitations.open-devices'
      >
        <Laptop weight='fill' className={getSize(6)} />
      </Button>
      {/* </Tooltip>
      <Tooltip content='List Spaces'> */}
      <Button onClick={() => setPanel(undefined)} disabled={!panel} data-testid='invitations.list-spaces'>
        <Planet weight='fill' className={getSize(6)} />
      </Button>
      {/* </Tooltip> */}
      {/* <ToolTip content='Toggle Network'> */}
      <Button
        onClick={() =>
          client.mesh.updateConfig(
            networkStatus === ConnectionState.ONLINE ? ConnectionState.OFFLINE : ConnectionState.ONLINE,
          )
        }
        data-testid='invitations.toggle-network'
      >
        {networkStatus === ConnectionState.ONLINE ? (
          <WifiHigh weight='fill' className={getSize(6)} />
        ) : (
          <WifiSlash weight='fill' className={getSize(6)} />
        )}
      </Button>
      {/* </ToolTip> */}
    </ButtonGroup>
  );

  const header = (
    <div className='flex' data-testid='invitations.identity-header'>
      Identity
      <span className='grow' />
      {controls}
    </div>
  );

  return (
    <div className={'flex flex-col m-4 flex-1 min-w-0'} data-testid={`peer-${id}`}>
      <div className={`${activeSurface} rounded p-2 mbe-2`}>
        <h1>{header}</h1>
        {identity ? (
          <List>
            <IdentityListItem identity={identity} presence={networkStatus as unknown as SpaceMember.PresenceState} />
          </List>
        ) : (
          <div className='text-center'>No identity</div>
        )}
      </div>
      {identity || panel ? (
        <div className={`${activeSurface} rounded p-2`}>
          <Panel id={id} panel={panel} setPanel={setPanel} />
        </div>
      ) : null}
    </div>
  );
};

// TODO(wittjosiah): This story fails to start in Safari/Webkit.
//   The issue appears to be related to dynamic imports during client initialization.
//   This does not seem to be a problem in other browsers nor in Safari in the app.
export const Default = {
  render: () => {
    return (
      // TODO(wittjosiah): Include Clipboard.Provider in layout decorator.
      <Clipboard.Provider>
        <Invitations />
      </Clipboard.Provider>
    );
  },
  decorators: [withMultiClientProvider({ numClients: 3 }), withLayout({ classNames: 'grid grid-cols-3' }), withTheme],
  parameters: {
    translations,
    chromatic: {
      disableSnapshot: true,
    },
  },
};
