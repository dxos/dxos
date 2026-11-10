//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Identity } from '@dxos/halo';

// #region service
const service = Effect.gen(function* () {
  const identity = yield* Identity.Service;
  return identity.getSnapshot();
});
// #endregion service

// #region access
const connect = Effect.gen(function* () {
  yield* Identity.grantServiceAccess({ serverName: 'hub.example.com', capabilities: ['compute'] });
  const token = yield* Identity.createApiToken({ label: 'CI', expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return token;
});
// #endregion access

export { connect, service };
