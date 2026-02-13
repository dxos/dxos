//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Invitation_State } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/react-ui/testing';

import { inviteWithState } from '../../testing/fixtures';

import { InvitationList } from './InvitationList';

const meta = {
  title: 'sdk/shell/InvitationList',
  component: InvitationList,
  decorators: [withTheme],
} satisfies Meta<typeof InvitationList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = () => {
  return (
    <InvitationList
      invitations={[
        inviteWithState(Invitation_State.INIT),
        inviteWithState(Invitation_State.CONNECTING),
        inviteWithState(Invitation_State.CONNECTED),
        inviteWithState(Invitation_State.READY_FOR_AUTHENTICATION),
        inviteWithState(Invitation_State.AUTHENTICATING),
        inviteWithState(Invitation_State.SUCCESS),
        inviteWithState(Invitation_State.TIMEOUT),
        inviteWithState(Invitation_State.ERROR),
        inviteWithState(Invitation_State.CANCELLED),
      ]}
      send={() => {}}
      createInvitationUrl={(invite) => invite}
    />
  );
};
