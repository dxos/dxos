//
// Copyright 2021 DXOS.org
//

import type { MulticastObservable } from '@dxos/async';
import type { DatabaseRouter } from '@dxos/echo-schema';
import type { PublicKey } from '@dxos/keys';
import type { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import type { AuthenticatingInvitationObservable } from './invitations';
import type { Space } from './space';

/**
 * TODO(burdon): Public API (move comments here).
 */
// TODO(wittjosiah): Rename?
//   https://ts.dev/style/#naming-style
//   ClientApi? ClientProtocol?
export interface Echo {
  get spaces(): MulticastObservable<Space[]>;

  createSpace(): Promise<Space>;
  // cloneSpace(snapshot: SpaceSnapshot): Promise<Space>;
  getSpace(spaceKey: PublicKey): Space | undefined;

  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable;

  // TODO(burdon): Rename.
  dbRouter: DatabaseRouter;
}
