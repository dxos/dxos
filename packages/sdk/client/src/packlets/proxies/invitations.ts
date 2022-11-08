//
// Copyright 2022 DXOS.org
//

import { InvitationObservable } from '@dxos/client-services';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface InvitationWrapper extends InvitationObservable {
  get invitation(): Invitation;
}
