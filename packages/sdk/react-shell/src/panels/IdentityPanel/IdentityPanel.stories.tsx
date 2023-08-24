//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { Invitation } from '@dxos/react-client/invitations';

import { StorybookDialog } from '../../components/StorybookDialog';
import { InvitationManager, InvitationManagerProps } from '../../steps';
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
    identityKey: PublicKey.random(),
    profile: {
      displayName: faker.person.firstName(),
    },
  },
};

export default {
  title: 'Panels/Identity',
};

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

// export const IdentityActionChooser = {
//   decorators: [ClientDecorator()],
//   args: { activeView: 'identity action chooser' },
// };

// export const DeviceManager = {
//   decorators: [ClientDecorator()],
//   args: { activeView: 'device manager' },
// };
