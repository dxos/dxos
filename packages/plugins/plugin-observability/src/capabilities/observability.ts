//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ObservabilityCapabilities, type ObservabilityOptions } from '#types';

export default Capability.makeModule(({ observability }: ObservabilityOptions.ObservabilityPluginOptions) =>
  Effect.gen(function* () {
    const obs = yield* Effect.tryPromise(() => observability());
    yield* Effect.addFinalizer(() => obs.close());
    return [Capability.contribute(ObservabilityCapabilities.Observability, obs)];
  }),
);
