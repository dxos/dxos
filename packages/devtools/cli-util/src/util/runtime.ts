//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { type Type } from '@dxos/echo';

/** @deprecated Migrate to providing types via plugin capabilities. */
export const withTypes: (...types: Type.Entity.Any[]) => Effect.Effect<void, never, ClientService> = (...types) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    yield* Effect.promise(() => client.addTypes(types));
  });
