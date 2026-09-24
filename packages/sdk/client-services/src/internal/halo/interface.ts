//
// Copyright 2026 DXOS.org
//

import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';

import { type IdentityManagerProps } from './identity/index.ts';
import { type InvitationConnectionProps } from './invitations/index.ts';

//
// The halo subsystem's options. Stating them here rather than taking the stack's whole bag is what
// keeps the subsystem from depending on the host that composes it. The tags and interfaces this
// subsystem promises live in `contracts/identity.ts` and `contracts/invitations.ts`.
//

export type Options = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval' | 'automergeCredentials'
> & {
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  invitationConnectionDefaultProps?: InvitationConnectionProps;
};
