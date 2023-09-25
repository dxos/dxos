//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { SpaceMember } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';

import { SpacePanelImpl } from './SpacePanel';
import { SpacePanelImplProps } from './SpacePanelProps';
import { SpaceManagerImpl } from './steps';
import { InvitationListItemImpl, SpaceMemberListImpl, InvitationList } from '../../components';
import { StorybookDialog } from '../../components/StorybookDialog';
import { InvitationManager, InvitationManagerProps } from '../../steps';
import { inviteWithState } from '../../testing';

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

export const SpaceManagerWithMoreInvites = () => {
  return (
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation.State.INIT),
                inviteWithState(Invitation.State.CONNECTING),
                inviteWithState(Invitation.State.CONNECTED),
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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation.State.INIT),
                inviteWithState(Invitation.State.READY_FOR_AUTHENTICATION),
                inviteWithState(Invitation.State.AUTHENTICATING),
                inviteWithState(Invitation.State.SUCCESS),
                inviteWithState(Invitation.State.ERROR),
                inviteWithState(Invitation.State.TIMEOUT),
                inviteWithState(Invitation.State.CANCELLED),
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
                    } = invitation;
                    return (
                      <InvitationListItemImpl
                        {...props}
                        createInvitationUrl={(code) => code}
                        invitationStatus={{
                          status: state,
                          authMethod,
                          invitationCode: id,
                          authCode: state === Invitation.State.READY_FOR_AUTHENTICATION ? '123414' : undefined,
                          id,
                          result: { identityKey, swarmKey, spaceKey },
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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
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
                      identity: {
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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
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
                      identity: {
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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
        SpaceManager={(props) => {
          return (
            <SpaceManagerImpl
              {...props}
              invitations={[
                inviteWithState(Invitation.State.SUCCESS),
                inviteWithState(Invitation.State.READY_FOR_AUTHENTICATION),
                inviteWithState(Invitation.State.AUTHENTICATING),
              ]}
              SpaceMemberList={(props) => (
                <SpaceMemberListImpl
                  {...props}
                  members={[
                    {
                      presence: SpaceMember.PresenceState.ONLINE,
                      identity: {
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'John Doe',
                        },
                      },
                    },
                    {
                      presence: SpaceMember.PresenceState.OFFLINE,
                      identity: {
                        identityKey: PublicKey.random(),
                        profile: {
                          displayName: 'Alice Wong',
                        },
                      },
                    },
                    {
                      presence: SpaceMember.PresenceState.OFFLINE,
                      identity: {
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
        InvitationManager={(props) => <InvitationManager {...props} {...extraprops} />}
      />
    </StorybookDialog>
  );
};

export const SpaceInvitationManagerInit = () => SpaceInvitationManagerState({ status: Invitation.State.INIT, id: '0' });

export const SpaceInvitationManagerConnecting = () =>
  SpaceInvitationManagerState({ status: Invitation.State.CONNECTING, id: '1' });

export const SpaceInvitationManagerConnected = () =>
  SpaceInvitationManagerState({ status: Invitation.State.CONNECTED, id: '2' });

export const SpaceInvitationManagerReadyForAuthentication = () =>
  SpaceInvitationManagerState({ status: Invitation.State.READY_FOR_AUTHENTICATION, authCode: '123451', id: '3' });

export const SpaceInvitationManagerAuthenticating = () =>
  SpaceInvitationManagerState({ status: Invitation.State.AUTHENTICATING, id: '4' });

export const SpaceInvitationManagerSuccess = () => SpaceInvitationManagerState({ status: Invitation.State.SUCCESS });

export const SpaceInvitationManagerError = () => SpaceInvitationManagerState({ status: Invitation.State.ERROR });

export const SpaceInvitationManagerTimeout = () => SpaceInvitationManagerState({ status: Invitation.State.TIMEOUT });

export const SpaceInvitationManagerCancelled = () =>
  SpaceInvitationManagerState({ status: Invitation.State.CANCELLED });
