//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space, type SpaceMember, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';
import { useMultiClient, withMultiClientProvider } from '@dxos/react-client/testing';
import { ButtonGroup, Clipboard, IconButton, List } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { activeSurface } from '@dxos/react-ui-theme';

import { IdentityListItem, SpaceListItem } from '../components';
import { IdentityPanel, JoinPanel, SpacePanel } from '../panels';
import { translations } from '../translations';

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
          <IconButton
            icon='ph--plus-circle--regular'
            size={6}
            label='Create Space'
            iconOnly
            onClick={() => client.spaces.create({ name: faker.commerce.productName() })}
            data-testid='invitations.create-space'
          />
          {/* </Tooltip>
          <Tooltip content='Join Space'> */}
          <IconButton
            icon='ph--sign-in--fill'
            size={6}
            label='Join Space'
            iconOnly
            onClick={() => setPanel('join')}
            data-testid='invitations.open-join-space'
          />
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
      <IconButton
        icon='ph--plus--regular'
        size={6}
        label='Create Identity'
        iconOnly
        onClick={() => client.halo.createIdentity({ displayName: faker.person.firstName() })}
        disabled={Boolean(identity)}
        data-testid='invitations.create-identity'
      />
      {/* </Tooltip>
      <Tooltip content='Join Existing Identity'> */}
      <IconButton
        icon='ph--qr-code--fill'
        size={6}
        label='Join Existing Identity'
        iconOnly
        onClick={() => setPanel('identity')}
        disabled={panel === 'identity'}
        data-testid='invitations.open-join-identity'
      />
      {/* </Tooltip>
      <Tooltip content='Devices'> */}
      <IconButton
        icon='ph--laptop--fill'
        size={6}
        label='Devices'
        iconOnly
        onClick={() => setPanel('devices')}
        disabled={!identity || panel === 'devices'}
        data-testid='invitations.open-devices'
      />
      {/* </Tooltip>
      <Tooltip content='List Spaces'> */}
      <IconButton
        icon='ph--planet--fill'
        size={6}
        label='List Spaces'
        iconOnly
        onClick={() => setPanel(undefined)}
        disabled={!panel}
        data-testid='invitations.list-spaces'
      />
      {/* </Tooltip> */}
      {/* <ToolTip content='Toggle Network'> */}
      <IconButton
        icon={networkStatus === ConnectionState.ONLINE ? 'ph--wifi-high--fill' : 'ph--wifi-slash--fill'}
        size={6}
        label='Toggle Network'
        iconOnly
        onClick={() =>
          client.mesh.updateConfig(
            networkStatus === ConnectionState.ONLINE ? ConnectionState.OFFLINE : ConnectionState.ONLINE,
          )
        }
        data-testid='invitations.toggle-network'
      />
      {/* </ToolTip> */}
    </ButtonGroup>
  );

  return (
    <div className={'flex flex-col m-4 flex-1 min-w-0'} data-testid={`peer-${id}`}>
      <div className={`${activeSurface} rounded p-2 mbe-2`}>
        <div data-testid='invitations.identity-header'>{controls}</div>
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

const meta = {
  title: 'sdk/shell/Invitations',
  decorators: [withTheme],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(wittjosiah): This story fails to start in Safari/Webkit.
//   The issue appears to be related to dynamic imports during client initialization.
//   This does not seem to be a problem in other browsers nor in Safari in the app.
export const Default: Story = {
  render: () => (
    // TODO(wittjosiah): Include Clipboard.Provider in layout decorator.
    <Clipboard.Provider>
      <Invitations />
    </Clipboard.Provider>
  ),
  decorators: [withMultiClientProvider({ numClients: 3 }), withLayout({ classNames: 'grid grid-cols-3' })],
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: true,
    },
    translations,
  },
};
