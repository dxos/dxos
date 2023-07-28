//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DensityProvider, ElevationProvider, useThemeContext } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { ClientDecorator } from '@dxos/react-client/testing';

import { SpacePanelImpl } from './SpacePanel';
import { SpacePanelImplProps } from './SpacePanelProps';

const noOpProps: SpacePanelImplProps = {
  titleId: 'storybookSpacePanel__title',
  send: () => {},
  createInvitationUrl: (code: string) => code,
  activeView: 'space manager',
  space: { key: PublicKey.random(), properties: { name: 'Example space' } },
};

const StorybookSpacePanel = (args: Partial<SpacePanelImplProps>) => {
  const spacePanelProps = { ...noOpProps, ...args };
  const { tx } = useThemeContext();
  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <div role='group' className={tx('dialog.content', 'dialog', { inOverlayLayout: false }, 'p-1')}>
          <SpacePanelImpl {...spacePanelProps} />
        </div>
      </ElevationProvider>
    </DensityProvider>
  );
};

export default {
  component: StorybookSpacePanel,
};

export const SpaceManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'space manager' },
};
