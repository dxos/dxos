//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Invitation } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/storybook-utils';

import { inviteWithState } from '../../testing/fixtures';

import { InvitationList } from './InvitationList';

const meta = {
  title: 'sdk/shell/InvitationList',
  component: InvitationList,
  decorators: [withTheme],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
} satisfies Meta<typeof InvitationList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = () => {
  return (
    <InvitationList
      invitations={[
        inviteWithState(Invitation.State.INIT),
        inviteWithState(Invitation.State.CONNECTING),
        inviteWithState(Invitation.State.CONNECTED),
        inviteWithState(Invitation.State.READY_FOR_AUTHENTICATION),
        inviteWithState(Invitation.State.AUTHENTICATING),
        inviteWithState(Invitation.State.SUCCESS),
        inviteWithState(Invitation.State.TIMEOUT),
        inviteWithState(Invitation.State.ERROR),
        inviteWithState(Invitation.State.CANCELLED),
      ]}
      send={() => {}}
      createInvitationUrl={(invite) => invite}
    />
  );
};
