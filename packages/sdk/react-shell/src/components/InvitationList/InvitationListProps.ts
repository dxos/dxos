//
// Copyright 2023 DXOS.org
//
import { type CancellableInvitationObservable } from '@dxos/react-client/invitations';

export interface SharedInvitationListProps {
  createInvitationUrl: (invitationCode: string) => string;
  send: (event: { type: 'selectInvitation'; invitation: CancellableInvitationObservable }) => void;
}
