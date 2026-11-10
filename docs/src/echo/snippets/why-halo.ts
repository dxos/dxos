//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Identity, Invitation, Space } from '@dxos/halo';

// #region pattern
const start = Effect.gen(function* () {
  const me = yield* Identity.create({ displayName: 'Ada' }); // a key pair, made on this device
  const team = yield* Space.create({ name: 'Team' });

  const flow = yield* Space.share(team.id, { authMethod: 'shared-secret' });
  return { me, invite: yield* Invitation.code(flow) }; // send the code; no sign-up server involved
});
// #endregion pattern

export { start };
