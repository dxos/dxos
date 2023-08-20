//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { PublicKey } from '@dxos/react-client';

import { StorybookDialog } from '../../components/StorybookDialog';
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

export const DeviceInvitationManager = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <IdentityPanelImpl
        {...noOpProps}
        activeView='device invitation manager'
        IdentityActionChooser={IdentityActionChooserImpl}
      />
    </StorybookDialog>
  );
};

// export const IdentityActionChooser = {
//   decorators: [ClientDecorator()],
//   args: { activeView: 'identity action chooser' },
// };

// export const DeviceManager = {
//   decorators: [ClientDecorator()],
//   args: { activeView: 'device manager' },
// };
