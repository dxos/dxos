//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Observability from '@dxos/observability/Observability';

import { ObservabilityCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const namespace = yield* ObservabilityCapabilities.Namespace;
    yield* Effect.promise(() =>
      Observability.showObservabilityBanner(namespace, (text) => process.stderr.write(`\n${text}\n\n`)),
    );
    return [];
  }),
);
