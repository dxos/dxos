//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Invitation } from '@dxos/react-client/invitations';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { inviteWithState } from '../../testing/fixtures';

import { InvitationList } from './InvitationList';

export default {
  title: 'sdk/shell/InvitationList',
  component: InvitationList,
  decorators: [withTheme, withLayout()],
  parameters: { chromatic: { disableSnapshot: false } },
};

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
