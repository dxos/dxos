//
// Copyright 2021 DXOS.org
//

import { MulticastObservable } from '@dxos/async';
import { DatabaseRouter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { AuthenticatingInvitationObservable } from './invitations';
import { Space } from './space';

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
