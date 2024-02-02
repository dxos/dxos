//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';
import { DeviceKind } from '@dxos/react-client/halo';
import { Invitation } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/storybook-utils';

import { IdentityPanelImpl } from './IdentityPanel';
import type { IdentityPanelImplProps } from './IdentityPanelProps';
import { IdentityActionChooserImpl } from './steps';
import { StorybookDialog } from '../../components/StorybookDialog';
import { InvitationManager, type InvitationManagerProps } from '../../steps';
import { osTranslations } from '../../translations';

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
  devices: [],
};

export default {
  title: 'react-shell/IdentityPanel',
  decorators: [withTheme],
  parameters: { translations: [osTranslations], chromatic: { disableSnapshot: false } },
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

export const UpdateProfileForm = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <IdentityPanelImpl
        {...noOpProps}
        activeView='update profile form'
        IdentityActionChooser={IdentityActionChooserImpl}
      />
    </StorybookDialog>
  );
};

export const DeviceManager = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <IdentityPanelImpl
        {...{
          ...noOpProps,
          devices: [
            { deviceKey: PublicKey.random(), kind: DeviceKind.CURRENT },
            { deviceKey: PublicKey.random(), kind: DeviceKind.TRUSTED },
            { deviceKey: PublicKey.random(), kind: DeviceKind.TRUSTED },
          ],
        }}
        activeView='device manager'
        IdentityActionChooser={IdentityActionChooserImpl}
      />
    </StorybookDialog>
  );
};

export const DeviceManagerEmpty = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <IdentityPanelImpl {...noOpProps} activeView='device manager' IdentityActionChooser={IdentityActionChooserImpl} />
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
