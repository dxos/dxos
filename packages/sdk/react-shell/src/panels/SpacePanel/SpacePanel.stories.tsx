//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/react-client/invitations';
import { ClientDecorator } from '@dxos/react-client/testing';

import { SpaceMemberListImpl } from '../../components';
import { StorybookDialog } from '../../components/StorybookDialog';
import { alice } from '../../testing/fixtures/identities';
import { inviteWithState } from '../../testing/fixtures/invitations';
import { SpacePanelImpl } from './SpacePanel';
import { SpacePanelImplProps } from './SpacePanelProps';
import { SpaceManagerImpl } from './steps';

const noOpProps: SpacePanelImplProps = {
  titleId: 'storybookSpacePanel__title',
  send: () => {},
  createInvitationUrl: (code: string) => code,
  activeView: 'space manager',
  space: { key: PublicKey.random(), properties: { name: 'Example space' } },
};

const SpacePanel = (args: Partial<SpacePanelImplProps>) => (
  <StorybookDialog>
    <SpacePanelImpl {...noOpProps} {...args} />
  </StorybookDialog>
);

export default {
  component: SpacePanel,
};

export const SpaceManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'space manager' },
};

export const SpaceInvitationManager = {
  decorators: [ClientDecorator()],
  args: { activeView: 'space invitation manager' },
};

export const PureSpaceManager = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[inviteWithState(Invitation.State.CONNECTING)]}
              SpaceMemberList={(props) => <SpaceMemberListImpl members={[alice]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};
