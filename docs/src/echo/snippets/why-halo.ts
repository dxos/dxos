//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Identity, Invitation, Space } from '@dxos/halo';

// #region pattern
const start = Effect.gen(function* () {
  // the identity and this device's key, made on this device
  const me = yield* Identity.create({ displayName: 'Ada' });
  const team = yield* Space.create({ name: 'Team' });

  const flow = yield* Space.share(team.id, { authMethod: 'shared-secret' });
  // send the code; no sign-up server involved
  return { me, invite: yield* Invitation.code(flow) };
});
// #endregion pattern

export { start };
