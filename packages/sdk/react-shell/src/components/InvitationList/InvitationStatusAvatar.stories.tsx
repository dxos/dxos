//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Invitation } from '@dxos/react-client/invitations';

import { InvitationStatusAvatar } from './InvitationStatusAvatar';

export default {
  component: InvitationStatusAvatar,
  actions: { argTypesRegex: '^on.*' },
};

export const Init = () => {
  return <InvitationStatusAvatar status={Invitation.State.INIT} />;
};

export const Connecting = () => {
  return <InvitationStatusAvatar status={Invitation.State.CONNECTING} />;
};

export const ReadyForAuthentication = () => {
  return <InvitationStatusAvatar status={Invitation.State.READY_FOR_AUTHENTICATION} />;
};

export const Authenticating = () => {
  return <InvitationStatusAvatar status={Invitation.State.AUTHENTICATING} />;
};

export const Connected = () => {
  return <InvitationStatusAvatar status={Invitation.State.CONNECTED} />;
};

export const Error = () => {
  return <InvitationStatusAvatar status={Invitation.State.ERROR} />;
};

export const Cancelled = () => {
  return <InvitationStatusAvatar status={Invitation.State.CANCELLED} />;
};

export const Success = () => {
  return <InvitationStatusAvatar status={Invitation.State.SUCCESS} />;
};

export const Timeout = () => {
  return <InvitationStatusAvatar status={Invitation.State.TIMEOUT} />;
};
