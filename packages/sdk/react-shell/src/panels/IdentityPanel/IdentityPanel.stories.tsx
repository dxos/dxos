//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React from 'react';

import { DensityProvider, ElevationProvider, useThemeContext } from '@dxos/aurora';
import { PublicKey } from '@dxos/react-client';
import { ClientDecorator } from '@dxos/react-client/testing';

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
      displayName: faker.name.firstName(),
    },
  },
};

const StorybookIdentityPanel = (args: Partial<IdentityPanelImplProps>) => {
  const identityPanelProps = { ...noOpProps, ...args };
  const { tx } = useThemeContext();
  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <div role='group' className={tx('dialog.content', 'dialog', { inOverlayLayout: false }, 'p-1')}>
          <IdentityPanelImpl {...identityPanelProps} />
        </div>
      </ElevationProvider>
    </DensityProvider>
  );
};

export default {
  component: StorybookIdentityPanel,
};

export const IdentityActionChooser = {
  decorators: [ClientDecorator()],
  args: { activeView: 'identity action chooser' },
};

export const DeviceManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'device manager' },
};
