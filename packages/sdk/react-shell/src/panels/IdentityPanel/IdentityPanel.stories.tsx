//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { ClientDecorator } from '@dxos/react-client/testing';

import { StorybookDialog } from '../../components/StorybookDialog';
import { IdentityPanelImpl } from './IdentityPanel';
import type { IdentityPanelImplProps } from './IdentityPanelProps';

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

const IdentityPanel = (args: Partial<IdentityPanelImplProps>) => (
  <StorybookDialog>
    <IdentityPanelImpl {...noOpProps} {...args} />
  </StorybookDialog>
);

export default {
  component: IdentityPanel,
};

export const IdentityActionChooser = {
  decorators: [ClientDecorator()],
  args: { activeView: 'identity action chooser' },
};

// export const DeviceManager = {
//   decorators: [ClientDecorator()],
//   args: { activeView: 'device manager' },
// };
