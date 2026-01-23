//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';

/** @deprecated Migrate to providing types via plugin capabilities. */
export const withTypes: (...types: Schema.Schema.AnyNoContext[]) => Effect.Effect<void, never, ClientService> = (
  ...types
) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    yield* Effect.promise(() => client.addTypes(types));
  });
