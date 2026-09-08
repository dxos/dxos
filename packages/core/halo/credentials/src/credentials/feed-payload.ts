//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type FeedMessage_Payload } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/**
 * The credential a control-feed payload carries.
 *
 * buf models the payload's `oneof` as a tagged union rather than a set of optional fields, so a
 * caller that built the payload from a credential reads it back through the tag.
 */
export const credentialOfPayload = (payload: FeedMessage_Payload): Credential => {
  invariant(payload.payload.case === 'credential', 'Feed payload does not carry a credential.');
  const { credential } = payload.payload.value;
  invariant(credential, 'Credentials message is empty.');
  return credential;
};
