//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { DensityProvider, ElevationProvider, useThemeContext } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { ClientDecorator } from '@dxos/react-client/testing';

import { SpacePanelImpl } from './SpacePanel';
import { SpacePanelImplProps } from './SpacePanelProps';
import { Dialog } from '../Dialog';

const noOpProps: SpacePanelImplProps = {
  titleId: 'storybookSpacePanel__title',
  send: () => {},
  createInvitationUrl: (code: string) => code,
  activeView: 'space manager',
  space: { key: PublicKey.random(), properties: { name: 'Example space' } },
};

const SpaceDialog = (args: Partial<SpacePanelImplProps>) => (
  <Dialog>
    <SpacePanelImpl {...noOpProps} {...args} />
  </Dialog>
);

export default {
  component: SpaceDialog,
};

export const SpaceManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'space manager' },
};

export const SpaceInvitationManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'space invitation manager' },
};
