//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/react-client/invitations';

import { SpaceMemberListImpl } from '../../components';
import { StorybookDialog } from '../../components/StorybookDialog';
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

export default {
  component: SpacePanelImpl,
};

export const SpaceManager = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithInvites = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[inviteWithState(Invitation.State.INIT)]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceInvitationDetail = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space invitation manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};
