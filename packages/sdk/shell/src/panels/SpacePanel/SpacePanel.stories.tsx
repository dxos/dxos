//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { create } from '@dxos/protocols/buf';
import { decodePublicKey, encodePublicKey } from '@dxos/protocols/buf';
import {
  IdentitySchema,
  SpaceMemberSchema,
  SpaceMember_PresenceState,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { SpaceMember_Role, type SpaceMember } from '@dxos/react-client/echo';
import { Invitation_State } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/react-ui/testing';

import { InvitationList, InvitationListItemImpl, SpaceMemberListImpl } from '../../components';
import { StorybookDialog } from '../../components/StorybookDialog';
import { InvitationManager, type InvitationManagerProps } from '../../steps';
import { inviteWithState } from '../../testing/fixtures';

import { SpacePanelImpl } from './SpacePanel';
import { type SpacePanelImplProps } from './SpacePanelProps';
import { SpaceManagerImpl } from './steps';

const noOpProps: SpacePanelImplProps = {
  titleId: 'storybookSpacePanel__title',
  send: () => {},
  createInvitationUrl: (code: string) => code,
  activeView: 'space manager',
  space: { key: PublicKey.random(), properties: { name: 'Example space' } },
};

const meta = {
  title: 'sdk/shell/SpacePanel',
  component: SpacePanelImpl,
  decorators: [withTheme],
} satisfies Meta<typeof SpacePanelImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
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
    <StorybookDialog inOverlayLayout>
      <SpacePanelImpl
        {...noOpProps}
        activeView='space manager'
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
                      identityKey = encodePublicKey(PublicKey.random()),
                      swarmKey,
                      spaceKey = encodePublicKey(PublicKey.random()),
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
                          result: {
                            identityKey: identityKey ? decodePublicKey(identityKey) : null,
                            swarmKey: swarmKey ? decodePublicKey(swarmKey) : null,
                            spaceKey: spaceKey ? decodePublicKey(spaceKey) : null,
                            target,
                          },
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
                    create(SpaceMemberSchema, {
                      presence: SpaceMember_PresenceState.ONLINE,
                      role: SpaceMember_Role.ADMIN,
                      identity: create(IdentitySchema, {
                        did: IdentityDid.random(),
                        identityKey: encodePublicKey(PublicKey.random()),
                      }),
                    }),
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
                    create(SpaceMemberSchema, {
                      presence: SpaceMember_PresenceState.ONLINE,
                      role: SpaceMember_Role.ADMIN,
                      identity: create(IdentitySchema, {
                        did: IdentityDid.random(),
                        identityKey: encodePublicKey(PublicKey.random()),
                        profile: create(ProfileDocumentSchema, { displayName: 'John Doe' }),
                      }),
                    }),
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
                inviteWithState(Invitation_State.SUCCESS),
                inviteWithState(Invitation_State.READY_FOR_AUTHENTICATION),
                inviteWithState(Invitation_State.AUTHENTICATING),
              ]}
              SpaceMemberList={(props) => (
                <SpaceMemberListImpl
                  {...props}
                  members={[
                    create(SpaceMemberSchema, {
                      presence: SpaceMember_PresenceState.ONLINE,
                      role: SpaceMember_Role.ADMIN,
                      identity: create(IdentitySchema, {
                        did: IdentityDid.random(),
                        identityKey: encodePublicKey(PublicKey.random()),
                        profile: create(ProfileDocumentSchema, { displayName: 'John Doe' }),
                      }),
                    }),
                    create(SpaceMemberSchema, {
                      presence: SpaceMember_PresenceState.OFFLINE,
                      role: SpaceMember_Role.ADMIN,
                      identity: create(IdentitySchema, {
                        did: IdentityDid.random(),
                        identityKey: encodePublicKey(PublicKey.random()),
                        profile: create(ProfileDocumentSchema, { displayName: 'Alice Wong' }),
                      }),
                    }),
                    create(SpaceMemberSchema, {
                      presence: SpaceMember_PresenceState.OFFLINE,
                      role: SpaceMember_Role.ADMIN,
                      identity: create(IdentitySchema, {
                        did: IdentityDid.random(),
                        identityKey: encodePublicKey(PublicKey.random()),
                        profile: create(ProfileDocumentSchema, { displayName: 'Steel Nickels' }),
                      }),
                    }),
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
