//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { Intersect, Laptop, Planet, Plus, PlusCircle, QrCode, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { useMemo, useState } from 'react';

import { Button, ButtonGroup } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { Group } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { Space, SpaceMember, SpaceProxy, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';
import { ClientDecorator } from '@dxos/react-client/testing';

import { IdentityListItem, SpaceListItem } from '../components';
import { IdentityPanel, JoinPanel, SpacePanel } from '../panels';

export default {
  title: 'Invitations',
};

export type PanelType = Space | 'identity' | 'devices' | 'join';

const createInvitationUrl = (invitation: string) => invitation;

const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setPanel: (panel?: PanelType) => void }) => {
  const client = useClient();
  const spaces = useSpaces();

  useMemo(() => {
    if (panel instanceof SpaceProxy) {
      (window as any)[`peer${id}CreateSpaceInvitation`] = (options?: Partial<Invitation>) => {
        const invitation = panel.createInvitation(options);

        invitation.subscribe((invitation) => {
          const invitationCode = InvitationEncoder.encode(invitation);
          if (invitation.state === Invitation.State.CONNECTING) {
            console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
          }
        });
      };
    }
  }, [panel]);

  if (panel instanceof SpaceProxy) {
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
            onClick={() => client.createSpace({ name: faker.animal.bird() })}
            data-testid='invitations.create-space'
          >
            <PlusCircle className={getSize(6)} />
          </Button>
          {/* </Tooltip>
          <Tooltip content='Join Space'> */}
          <Button onClick={() => setPanel('join')} data-testid='invitations.open-join-space'>
            <Intersect weight='fill' className={getSize(6)} />
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
        <Group label={{ children: header }}>
          <ul>
            {spaces.length > 0 ? (
              spaces.map((space) => (
                <SpaceListItem key={space.key.toHex()} space={space} onClick={() => setPanel(space)} />
              ))
            ) : (
              <div className='text-center'>No spaces</div>
            )}
          </ul>
        </Group>
      );
    }
  }
};

const Invitations = ({ id }: { id: number }) => {
  const client = useClient();
  const networkStatus = useNetworkStatus().swarm;
  const identity = useIdentity();
  const [panel, setPanel] = useState<PanelType>();

  useMemo(() => {
    (window as any)[`peer${id}CreateHaloInvitation`] = (options?: Partial<Invitation>) => {
      const invitation = client.halo.createInvitation(options);

      invitation.subscribe((invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        if (invitation.state === Invitation.State.CONNECTING) {
          console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
        }
      });
    };
  }, [client]);

  // TODO(wittjosiah): Tooltips make playwright (webkit) flakier.
  const controls = (
    <ButtonGroup classNames='mbe-4'>
      {/* <Tooltip content='Create Identity'> */}
      <Button
        onClick={() => client.halo.createIdentity({ displayName: faker.name.firstName() })}
        disabled={Boolean(identity)}
        data-testid='invitations.create-identity'
      >
        <Plus className={getSize(6)} />
      </Button>
      {/* </Tooltip>
      <Tooltip content='Join Existing Identity'> */}
      <Button
        onClick={() => setPanel('identity')}
        disabled={Boolean(identity) || panel === 'identity'}
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
    <div className='flex flex-col p-4 flex-1 min-w-0' data-testid={`peer-${id}`}>
      <Group label={{ children: header }} className='mbe-2'>
        {identity ? (
          <IdentityListItem identity={identity} presence={networkStatus as unknown as SpaceMember.PresenceState} />
        ) : (
          <div className='text-center'>No identity</div>
        )}
      </Group>
      {identity || panel ? <Panel id={id} panel={panel} setPanel={setPanel} /> : null}
    </div>
  );
};

export const Default = {
  render: (args: { id: number }) => <Invitations {...args} />,
  decorators: [ClientDecorator({ count: 3 })],
};
