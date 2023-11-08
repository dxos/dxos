//
// Copyright 2023 DXOS.org
//

import { type InvitationStatus } from '@dxos/react-client/invitations';

export type IInvitation = Pick<
  InvitationStatus,
  'id' | 'invitationCode' | 'authCode' | 'authMethod' | 'status' | 'haltedAt' | 'result' | 'error'
> & {
  onCancel: InvitationStatus['cancel'];
  statusValue: number;
  createInvitationUrl: (code: InvitationStatus['invitationCode']) => string;
};
