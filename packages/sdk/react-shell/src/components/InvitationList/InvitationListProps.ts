//
// Copyright 2023 DXOS.org
//
import { CancellableInvitationObservable } from '@dxos/react-client/invitations';

export interface SharedInvitationListProps {
  createInvitationUrl: (invitationCode: string) => string;
  send: (event: { type: 'selectInvitation'; invitation: CancellableInvitationObservable }) => void;
}
