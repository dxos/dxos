//
// Copyright 2020 DXOS.org
//

import { InvitationDescriptor } from '@dxos/echo-db';

export const encodeInvitation = (invitation: InvitationDescriptor) => btoa(JSON.stringify(invitation.toQueryParameters()));
export const decodeInvitation = (code: string) => InvitationDescriptor.fromQueryParameters(JSON.parse(atob(code)));

export const noOp = () => null;
