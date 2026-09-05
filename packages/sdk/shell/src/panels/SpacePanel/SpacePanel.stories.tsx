//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IdentityDid, PublicKey } from '@dxos/keys';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';
import { type Invitation, Invitation_State } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/react-ui/testing';

import { InvitationList, InvitationListItemImpl, SpaceMemberListImpl } from '../../components';
import { InvitationManager, type InvitationManagerProps } from '../../steps';
import { StorybookDialog } from '../../story-components';
import { inviteWithState } from '../../testing/fixtures';
import { SpaceManagerImpl } from './SpaceManager';
import { SpacePanelImpl } from './SpacePanel';
import { type SpacePanelImplProps } from './SpacePanelProps';

const noopProps: SpacePanelImplProps = {
  titleId: 'storybookSpacePanel__title',
  send: () => {},
  createInvitationUrl: (code: string) => code,
  activeView: 'space-manager',
  space: { key: PublicKey.random(), properties: { name: 'Example space' } },
};

const meta = {
  title: 'sdk/shell/SpacePanel',
  component: SpacePanelImpl,
  decorators: [withTheme()],
} satisfies Meta<typeof SpacePanelImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpaceManager = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
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
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[inviteWithState(Invitation_State.INIT)]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithMoreInvites = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation_State.INIT),
                inviteWithState(Invitation_State.CONNECTING),
                inviteWithState(Invitation_State.CONNECTED),
              ]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithEvenMoreInvites = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation_State.INIT),
                inviteWithState(Invitation_State.READY_FOR_AUTHENTICATION),
                inviteWithState(Invitation_State.AUTHENTICATING),
                inviteWithState(Invitation_State.SUCCESS),
                inviteWithState(Invitation_State.ERROR),
                inviteWithState(Invitation_State.TIMEOUT),
                inviteWithState(Invitation_State.CANCELLED),
              ]}
              InvitationList={(props) => (
                <InvitationList
                  {...props}
                  InvitationListItem={(props) => {
                    const invitation = props.invitation.get();
                    const {
                      authMethod,
                      invitationId: id,
                      state,
                      identityKey = PublicKey.random(),
                      swarmKey,
                      spaceKey = PublicKey.random(),
                      target = null,
                    } = invitation;
                    return (
                      <InvitationListItemImpl
                        {...props}
                        createInvitationUrl={(code) => code}
                        invitationStatus={{
                          status: state,
                          authMethod,
                          invitationCode: id,
                          authCode: state === Invitation_State.READY_FOR_AUTHENTICATION ? '123414' : undefined,
                          id,
                          result: { identityKey, swarmKey, spaceKey, target },
                          cancel: () => {},
                          authenticate: async (authCode: string) => {},
                          connect: () => {},
                        }}
                      />
                    );
                  }}
                />
              )}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithMember = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[]}
              SpaceMemberList={(props) => (
                <SpaceMemberListImpl
                  {...props}
                  members={[
                    {
                      presence: SpaceMember.PresenceState.ONLINE,
                      role: HaloSpaceMember.Role.ADMIN,
                      identity: {
                        did: IdentityDid.random(),
                        identityKey: PublicKey.random(),
                      },
                    },
                  ]}
                />
              )}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithMembers = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[]}
              SpaceMemberList={(props) => (
                <SpaceMemberListImpl
                  {...props}
                  members={[
                    {
                      presence: SpaceMember.PresenceState.ONLINE,
                      role: HaloSpaceMember.Role.ADMIN,
                      identity: {
                        did: IdentityDid.random(),
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'John Doe',
                        },
                      },
                    },
                  ]}
                />
              )}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

export const SpaceManagerWithMoreMembers = () => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation_State.SUCCESS),
                inviteWithState(Invitation_State.READY_FOR_AUTHENTICATION),
                inviteWithState(Invitation_State.AUTHENTICATING),
              ]}
              SpaceMemberList={(props) => (
                <SpaceMemberListImpl
                  {...props}
                  members={[
                    {
                      presence: SpaceMember.PresenceState.ONLINE,
                      role: HaloSpaceMember.Role.ADMIN,
                      identity: {
                        did: IdentityDid.random(),
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'John Doe',
                        },
                      },
                    },
                    {
                      presence: SpaceMember.PresenceState.OFFLINE,
                      role: HaloSpaceMember.Role.ADMIN,
                      identity: {
                        did: IdentityDid.random(),
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'Alice Wong',
                        },
                      },
                    },
                    {
                      presence: SpaceMember.PresenceState.OFFLINE,
                      role: HaloSpaceMember.Role.ADMIN,
                      identity: {
                        did: IdentityDid.random(),
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'Steel Nickels',
                        },
                      },
                    },
                  ]}
                />
              )}
            />
          );
        }}
      />
    </StorybookDialog>
  );
};

const SpaceInvitationManagerState = (extraprops?: Partial<InvitationManagerProps>) => {
  return (
    <StorybookDialog>
      <SpacePanelImpl
        {...noopProps}
        activeView='space-invitation-manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[]}
              SpaceMemberList={(props) => <SpaceMemberListImpl {...props} members={[]} />}
            />
          );
        }}
        InvitationManager={(props) => <InvitationManager {...props} {...extraprops} />}
      />
    </StorybookDialog>
  );
};

export const SpaceInvitationManagerInit = () => SpaceInvitationManagerState({ status: Invitation_State.INIT, id: '0' });

export const SpaceInvitationManagerConnecting = () =>
  SpaceInvitationManagerState({ status: Invitation_State.CONNECTING, id: '1' });

export const SpaceInvitationManagerConnected = () =>
  SpaceInvitationManagerState({ status: Invitation_State.CONNECTED, id: '2' });

export const SpaceInvitationManagerReadyForAuthentication = () =>
  SpaceInvitationManagerState({ status: Invitation_State.READY_FOR_AUTHENTICATION, authCode: '123451', id: '3' });

export const SpaceInvitationManagerAuthenticating = () =>
  SpaceInvitationManagerState({ status: Invitation_State.AUTHENTICATING, id: '4' });

export const SpaceInvitationManagerSuccess = () => SpaceInvitationManagerState({ status: Invitation_State.SUCCESS });

export const SpaceInvitationManagerError = () => SpaceInvitationManagerState({ status: Invitation_State.ERROR });

export const SpaceInvitationManagerTimeout = () => SpaceInvitationManagerState({ status: Invitation_State.TIMEOUT });

export const SpaceInvitationManagerCancelled = () =>
  SpaceInvitationManagerState({ status: Invitation_State.CANCELLED });
