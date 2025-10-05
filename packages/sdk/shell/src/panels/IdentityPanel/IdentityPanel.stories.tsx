//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IdentityDid } from '@dxos/keys';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';
import { Invitation } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/storybook-utils';

import { StorybookDialog } from '../../components/StorybookDialog';
import { InvitationManager, type InvitationManagerProps } from '../../steps';
import { translations } from '../../translations';

import { IdentityPanelImpl } from './IdentityPanel';
import type { IdentityPanelImplProps } from './IdentityPanelProps';
import { IdentityActionChooserImpl } from './steps';

faker.seed(1234);

const noOpProps: IdentityPanelImplProps = {
  titleId: 'storybookIdentityPanel',
  send: () => {},
  activeView: 'identity action chooser',
  createInvitationUrl: (code) => code,
  identity: {
    did: IdentityDid.random(),
    identityKey: PublicKey.random(),
    profile: {
      displayName: faker.person.firstName(),
    },
  },
  devices: [],
  connectionState: ConnectionState.ONLINE,
  onManageCredentials: async () => console.log('manage credentials'),
};

const meta = {
  title: 'sdk/shell/IdentityPanel',
  decorators: [withTheme],
  parameters: {
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof IdentityDid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IdentityActionChooser = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <IdentityPanelImpl
        {...noOpProps}
        activeView='identity action chooser'
        IdentityActionChooser={IdentityActionChooserImpl}
      />
    </StorybookDialog>
  );
};

const DeviceInvitationManagerWithState = (extraProps: InvitationManagerProps) => (
  <StorybookDialog inOverlayLayout>
    <IdentityPanelImpl
      {...noOpProps}
      activeView='device invitation manager'
      IdentityActionChooser={IdentityActionChooserImpl}
      InvitationManager={(props) => <InvitationManager {...props} {...extraProps} />}
    />
  </StorybookDialog>
);

export const DeviceInvitationManager = () =>
  DeviceInvitationManagerWithState({ status: Invitation.State.INIT, id: '0' });

export const DeviceInvitationManagerConnecting = () =>
  DeviceInvitationManagerWithState({
    status: Invitation.State.CONNECTING,
    id: '1',
  });

export const DeviceInvitationManagerConnected = () =>
  DeviceInvitationManagerWithState({
    status: Invitation.State.CONNECTED,
    id: '2',
  });

export const DeviceInvitationManagerReady = () =>
  DeviceInvitationManagerWithState({
    status: Invitation.State.READY_FOR_AUTHENTICATION,
    authCode: '123123',
    id: '3',
  });

export const DeviceInvitationManagerAuthenticating = () =>
  DeviceInvitationManagerWithState({
    status: Invitation.State.AUTHENTICATING,
    id: '4',
  });

export const DeviceInvitationManagerSuccess = () =>
  DeviceInvitationManagerWithState({ status: Invitation.State.SUCCESS });

export const DeviceInvitationManagerError = () => DeviceInvitationManagerWithState({ status: Invitation.State.ERROR });

export const DeviceInvitationManagerTimeout = () =>
  DeviceInvitationManagerWithState({ status: Invitation.State.TIMEOUT });

export const DeviceInvitationManagerCancelled = () =>
  DeviceInvitationManagerWithState({
    status: Invitation.State.CANCELLED,
  });
